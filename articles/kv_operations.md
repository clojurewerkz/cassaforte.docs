---
title: "Key/Value Operations"
layout: article
---

## About this guide

This guide explains more complex Key/Value operations, such as

  * Insertion, querying and deletion of values
  * Indexing
  * Consistency levels
  * Retry Policies
  * TTL for entries
  * Batch Operations
  * Counters
  * Range Queries
  * Collection types

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

## Tuning consistency

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

## Timestamp and TTL

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
