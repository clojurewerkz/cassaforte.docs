---
title: "Key/Value Operations"
layout: article
---

## About this guide

This guide explains more complex Key/Value operations, such as

  * Inserting values
  * Tuning consistency/availability
  * Timestampls and TTL
  * Prepared Statements
  * Collection Types
  * Counter Columns
  * Range queries
  * Pagination
  * Filtering
  * Ordering

This guide relies on things that are also mentioned in [Advanced Client Options](/articles/advanced_client_options.html) guide.

Every example will start with Clojure code followed by corresponding CQL statement.

## Inserting values

Let's create users table where we'll insert the values:

```clj
(create-table :users
              (column-definitions {:name :varchar
                                   :age  :int
                                   :city :varchar
                                   :primary-key [:name]}))
```

```sql
CREATE TABLE users
  (age int,
   name varchar,
   city varchar,
   PRIMARY KEY (name));
```

Now, let's insert some values into this table:

```clj
(insert :users {:name "Alex" :city "Munich" :age (int 19)})
```

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);
```

That one's easy, right? When you query database, you'll see that the inserted value:

```clj
(select :users)
```

```sql
SELECT * FROM users;
```

```
|  name |  age |   city |
|-------+------+--------|
|  Alex |   19 | Munich |
```

### Tuning consistency

With Cassaforte, it is possible to tune Consistency on a per-query basis.
In order to do that, wrap your database call into `clojurewerkz.cassaforte.client/with-consistency-level`.

Available Consistency options are:

  * `:any`: write must be written to at least one node. `:any` will succeed even if all replica nodes
    are down and __hinted handoff__ write was made. Although in that case write will not become readable
    until replica nodex for the given key recover.
  * `:one`: write must be written to commit log and memory table of at least one replica node.
  * `:two`: write must be written to commit log and memory table of at least two replica nodes.
  * `:three`: write must be written to commit log and memory table of at least three replica nodes.
  * `:quorum`: write must be written to commit log and memory table to quorum of replica nodes.
  * `:local-quorum`: write must be written to commit log and memory table to quorum of replica nodes
    located in the same datacenter as coordinator node.
  * `:each-quorum`: write must be written to commit log and memory table to quorum of replica nodes
    in all datacenters.
  * `:all`: write must be written to commit log and memory table of all replica nodes for given key.

It is clear that `:all` has strongest __Consistency__, but weakest __Availability__ guarantees, because
all the nodes should be up during the write, whereas `:one` has strongest __Availability__ but weakest
__Consistency__ guarantees, because if the node went down before replicating data to other nodes,
it won't be possible to read it until the node is back up.

Quorum is calculated as `(replication-factor / 2) + 1`, so for replication factor of 3, quorum would be
2, which means that it will tolerate when 1 node is down. For replication factor of 6, quorum is 4,
which tolerates 2 nodes are down.

It is hard to say which values should be taken for your application. If the write is made with consistency
level of `:one`, it doesn't mean that data won't be replicated to all the nodes in replica set, it only
means that write is acknowledged without making sure it's replicated. You can reduce latency and increase
Availability by using lower Consistency Level, but you should always keep in mind what you're trading off.

Following operation will be performed with consistenct level of `:one`:

```clj
(client/with-consistency-level (client/consistency-level :one
  (insert :users {:name "Alex" :city "Munich" :age (int 19)}))
```

### Timestamp and TTL

When performing writes, you can specify Timestamp for the written columns. Even if you do not specify
Timestamp manually, it is set by Cassandra internally. You can check it by using `cassandra-cli`, which
is coming together with Cassandra package. You can learn more about this tool in [Troubleshooting](/articles/troubleshooting.html) guide.

```
> cassandra-cli
> list users;
RowKey: Alex
=> (column=, value=, timestamp=1369947837808000)
=> (column=age, value=00000013, timestamp=1369947837808000)
=> (column=city, value=4d756e696368, timestamp=1369947837808000)
```

You can see `timestamp` set by Cassandra for the write we've made. In order to make a write with
manually set timestamp, you should use `(using :timestamp)` clause in your query:

```clj
(insert :users {:name "Alex" :city "Munich" :age (int 19)}
        (using :timestamp (.getTime (java.util.Date.))))
```

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19) USING TIMESTAMP 1369948317602;
```

And you'll see the timestamp you've set in `cassandra-cli`:

```
> cassandra-cli
> list users;
RowKey: Alex
=> (column=, value=, timestamp=1369948761376)
=> (column=age, value=00000013, timestamp=1369948761376)
=> (column=city, value=4d756e696368, timestamp=1369948761376)
```

Clocks on all the clients (and Cassandra servers, too) should be in sync.

Timestamps are used for conflict resolution. Column with has higher timestamp will win over the record
with lower timestamp in case of conflict, and will be replicated. You can use arbitrary numbers for
timestamps, but microseconds since Unix Epoch (1970) are used as a convention.

You can also specify optional TTL (Time To Live) for the column. If you do so, column will expire after
specified amount of time.


```clj
(insert :users {:name "Alex" :city "Munich" :age (int 19)}
        (using :ttl 60))
```

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19) USING TTL 60;
```

You can run select query after 60 seconds and make sure that your column is gone now.

When using TTL, you should remember that if you update record with `(using :ttl)` clause, column
livespan will be reset, and counted from the moment of insert. You can figure you exact time when
column will be deleted by finding out it's timestamp and adding TTL to it.

### Prepared Statements

Prepared statements have same meaning as in relational databases. Server pases query once, and
assigns a unique identifier, which is cached by clients for future references. Each time query
is executed, only values are passed between client and server. This reduces an overhead of
parsing query each time and amount of data sent over the network.

For example, a simple query to insert values to the table would be:

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);
```

Prepared query would keep `?` placeholders instead of values:

```sql
INSERT INTO users (name, city, age) VALUES (?, ?, ?);
```

In order to execute a prepared query, you can use `client/execute` function:

```clj
(client/execute
 (client/as-prepared "INSERT INTO users (name, city, age) VALUES (?, ?, ?);"
                     "Alex" "Munich" (int 19))
 :prepared true)
```

Internally, execute will prepare query or get cached identifier and execute prepared statement
against the cluster. However, we provide a higher-level API for working with prepared statements.
You can wrap any query from `cql` namespace into `client/prepared`, which will execute query as
prepared one:

```clj
(client/prepared
 (insert :users {:name "Alex" :city "Munich" :age (int 19)}))
```

If you want to run __all__ queries generated by `cql` or `multi.cql` namespaces as prepared,
you can use `force-prepared-queries` connection option.

### Counters

Cassandra has a powerful concept, __Distributed Counters__. Counter columns provide an efficient
way to count or sum anything you need. It is achieved by using atomic increment/decrement operations
on values.

Counter is a special column type, whose value is a 64-bit (signed) interger. On write, new value
is added (or substracted) to previous counter value. It should be noted that usual consistency/availability
tradeoffs apply to counter operations. Also, because of the nature of counters, it is required to
perform a read before write in a background, therefore updates on counters are slightly slower than
usual updates. Counter reads have same performace as regular column reads.

For example, you can create a new table (`user_counters`) with `counter` column, and `name` key
for counting user-specific operations, such as amount of operations performed by the user:

```clj
(create-table :user_counters
              (column-definitions {:name :varchar
                                   :user_count  :counter
                                   :primary-key [:name]}))
```

```sql
CREATE TABLE user_counters
  (name varchar,
   user_count counter,
   PRIMARY KEY (name));
```

In order to modify (increment or decrement) counter, you can use the following syntax:

```clj
(update :user_counters
        {:user_count (increment-by 5)}
        (where :name "user1"))

(update :user_counters
        {:user_count (decrement-by 5)}
        (where :name "user1"))
```

Which will execute following CQL queries, correspondingly:

```sql
UPDATE user_counters SET user_count = user_count + 5 WHERE name = 'asd';
UPDATE user_counters SET user_count = user_count - 5 WHERE name = 'asd';
```

### Querying

You get good query possibilities in Cassandra, but you have to model your data to be able to
build flexible queries against your dataset. It is important to pick your parition key wisely,
since it's the core of all the queries. To learn more about data modelling practices, refer
to [Data Modelling](/articles/data_modelling.html) guide. There you can learn more about picking
a partition key, using compound keys and other useful things.

#### Paginating through results

One of the first questions I usually get is wether it is possible to paginate through results
in Cassandra. Short answer: yes, although not exactly the same way you may be used, if you've
been using SQL data store for long enough.

There're several ways to do that without creating additional index tables for storing ranges,
but they're used in different circumstances.

If you want to paginate through the complete table, which is sometimes called __iterate-world__
in NoSQL terms, you want to use `tokens` for that. Because different nodes store your results,
each key gets a token attached to it, therefore you can't say "ok, give me the all the keys
that are __larger__ than the given one". What you have to do, though, is to get first `page`
of results: `SELECT * FROM users LIMIT 10`, get the `key` of last result, use `token()` function
to determine an internal storage key.

Let's create a users table for that:

```clj
(create-table :users
              (column-definitions {:name :varchar
                                   :age  :int
                                   :city :varchar
                                   :primary-key [:name]}))
```

```sql
CREATE TABLE users (age int, name varchar, city varchar, PRIMARY KEY (name));
```

And populate 100 entries to it:

```clj
(dotimes [i 100]
  (insert :users {:name (str "name_" i) :city (str "city" i) :age (int i)}))
```

Now, let's get a first page:

```clj
(select :users (limit 10))
```

```sql
SELECT * FROM users LIMIT 10;
```

This will return us first 10 users, although in rather random order. This happens
because ordering is only possible when partition key is restricted by one of the equality
operators.

Now, you should get the `name` (which is a partition key value in that case) of the last
user in the resulting collection. Let's say it was `name_53`. In order to get the next __page__,
you should use `token` function:

```clj
(select :users
  (where (token :name) [> (token "name_53")])
  (limit 10))
```

```sql
SELECT * FROM users WHERE token(name) > token('name_53') LIMIT 10;
```

This will return next chunk of entries for you.
There's a convenience function built into Cassaforte, which is using lazy sequences underneath.
If you want to iterate over `users` collection, using `name` as a partition key, and get `10`
results per page, you can use:

```clj
(iterate-world :users :name 10)
```

Which will do all forementioned things for you.

#### Range queries

In case you use compound keys, you have more flexibility. Here, you can lock your partition key
using `IN` or equality operator `=` and perform range queries on the results. It is possible, because
Cassandra stores all entries with same partition key on same node, which guarantees good performance
when retrieving records.

For that example, let's model `tv_series` table, which will use a compound key. Partition key will be
`series_title` (I like Futurama, yay!), second part of compound key will be `episode_id`. Rest of
columns will store some information about series.

```clj
(create-table :tv_series
              (column-definitions {:series_title  :varchar
                                   :episode_id    :int
                                   :episode_title :text
                                   :primary-key [:series_title :episode_id]}))
```

```sql
CREATE TABLE tv_series (episode_title text,
                        series_title varchar,
                        episode_id int,
                        PRIMARY KEY (series_title, episode_id));
```

Now, let's insert some episode data into the table:

```clj
(dotimes [i 20]
  (insert :tv_series {:series_title "Futurama" :episode_id i :episode_title (str "Futurama Title " i)})
  (insert :tv_series {:series_title "Simpsons" :episode_id i :episode_title (str "Simpsons Title " i)}))
```

If you lock partition key by using equality `WHERE series_title = 'Futurama'` or `IN` operator:
`WHERE series_title IN ('Futurama', 'Simpsons')`, you can perform range queries on `episode_id`
(which is a second part of compound key).

```clj
(select :tv_series
        (where :series_title [:in ["Futurama" "Simpsons"]]
               :episode_id [> 10]))
```

```sql
SELECT * FROM tv_series WHERE series_title IN ('Futurama', 'Simpsons') AND episode_id > 10;
```

In the same manner, you can use `>=`, `>`, `<` and `<=` operators for performing range queries. In addition,
you can query for a closed range (__from__ .. __to__):

```clj
(select :tv_series
        (where :series_title "Futurama"
               :episode_id [> 10]
               :episode_id [<= 15]))
```

```sql
SELECT * FROM tv_series WHERE series_title = 'Futurama' AND episode_id > 10 AND episode_id <= 15;
```

### Ordering results

When partition key is locked, you can also run queries with `ORDER BY` clause, which will order
results by any part of the key except for partition key:

```clj
(select :tv_series
        (where :series_title "Futurama")
        (order-by [:episode_id]))
```

```sql
SELECT * FROM tv_series
  WHERE series_title = 'Futurama'
  ORDER BY episode_id;
```

### Filtering

By default, Cassandra disallows potentially expensive queries, that involve data filtering on the
server side. That is done to run queries with predictable performance, which is proportional to the
amount of data returned from server.

<div class="alert alert-error">
It's required to say that, depending on a dataset size, allowing filtering may hurt performance.
</div>

For this example, let's use beforementioned `users` table, and add index on `age` and `city` to it:

```sql
CREATE TABLE users
  (age int,
   name varchar,
   city varchar,
   PRIMARY KEY (name));
```

```clj
(create-index :users :age)
(create-index :users :city)
```

```sql
CREATE INDEX ON users (age);
CREATE INDEX ON users (city);
```

Now, it is possible to query for all users of certain `age` living in a certain `city` using
`ALLOW FILTERING` clause:

```clj
(select :users
        (where :city "Munich"
               :age [> (int 5)])
        (allow-filtering true))
```

```sql
SELECT * FROM users WHERE city = 'Munich' AND age > 5 ALLOW FILTERING;
```
