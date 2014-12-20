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

This guide relies on certain features that are covered in [Advanced Client Options](/articles/advanced_client_options.html) guide.

## What version of Cassaforte does this guide cover?

This guide covers Cassaforte 2.0 (including preview releases).

## Inserting Rows

Consider the following table:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn :users
                (column-definitions {:name :varchar
                                     :age  :int
                                     :city :varchar
                                     :primary-key [:name]})))
```

```sql
CREATE TABLE users
  (age int,
   name varchar,
   city varchar,
   PRIMARY KEY (name));
```

To insert a row in a table, use `clojurewerkz.cassaforte.cql/insert`:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/insert conn "users" {:name "Alex" :age (int 19)}))
```

The example above will use the following CQL:

```sql
INSERT INTO "users" (name, age) VALUES ('Alex', 19);
```

## Fetching Rows

The real power of CQL comes in querying. You can use standard equality queries,
`IN` queries, and range queries.

The examples above need some data to be in the "users" table:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users"]
  (cql/insert conn table {:name "Alex" :city "Munich" :age (int 19)})
  (cql/insert conn table {:name "Robert" :city "Berlin" :age (int 25)})
  (cql/insert conn table {:name "Sam" :city "San Francisco" :age (int 21)}))
```

The above example will execute the CQL you expect:

```sql
INSERT INTO "users" (name, city, age) VALUES ('Alex', 'Munich', 19);
INSERT INTO "users" (name, city, age) VALUES ('Robert', 'Berlin', 25);
INSERT INTO "users" (name, city, age) VALUES ('Sam', 'San Francisco', 21);
```

Most straightforward thing is to select all users:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users"]
  (cql/select conn table))
;; => [{:name "Robert", :age 25, :city "Berlin"}
;;     {:name "Alex", :age 19, :city "Munich"}
;;     {:name "Sam", :age 21, :city "San Francisco"}]
```

In CQL, the query above will look like this:

```sql
SELECT * FROM "users";
```

Next, query a user by name:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users"]
  (cql/select conn table (where [[= :name "Alex"]])))
;; => [{:name "Alex", :age 19, :city "Munich"}]
```

The CQL executed this time will be

```sql
SELECT * FROM "users" WHERE name = 'Alex';
```

Next, query for rows that match any of the values given in a vector (so so-called `IN` query):

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users"]
  (cql/select conn table (where [[:in :name ["Alex" "Robert"]]])))
;; => [{:name "Alex", :age 19, :city "Munich"}
;;     {:name "Robert", :age 25, :city "Berlin"}]
```

The `IN` query is named after the CQL operator it uses:

```sql
SELECT * FROM "users" WHERE name IN ('Alex', 'Robert');
```

Sorting and range queries in Cassandra have limitations compared to
relational databases. Sorting is only possible when partition key is restricted by either
exact match or `IN`. For example, having these `user_posts`:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users_posts"]
  (cql/insert conn "user_posts" {:username "Alex" :post_id "post1" :body "first post body"})
  (cql/insert conn "user_posts" {:username "Alex" :post_id "post2" :body "second post body"})
  (cql/insert conn "user_posts" {:username "Alex" :post_id "post3" :body "third post body"}))
```

You can't sort all the posts by post_id. But if you say that you want
to get all the posts from user Alex and sort them by `post_id`, it's
possible:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users_posts"]
  ;; For brevity, we select :post_id column only
  (cql/select conn table
          (columns :post_id)
          (where [[= :username "Alex"]])
          (order-by [:post_id :desc])))

;; => [{:post_id "post3"}
;;     {:post_id "post2"}
;;     {:post_id "post1"}]
```

CQL used by the code above is quite straightforward:

```sql
SELECT post_id FROM "user_posts"
  WHERE username = 'Alex'
  ORDER BY post_id desc;
```

Finally, you can use range queries to get a slice of data:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users_posts"]
  ;; For brevity, we select :post_id column only
  (cql/select conn table
          (columns :post_id)
          (where [[= :username "Alex"]
                  [> :post_id "post1"]
                  [< :post_id "post3"]])))
;; => [{:post_id "post2"}]
```

will use

```sql
SELECT post_id FROM "user_posts"
  WHERE username = 'Alex'
    AND post_id > 'post1'
    AND post_id < 'post3';
```

In order to limit results of your query, use `limit` clause:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users_posts"]
  (cql/select conn table (limit 1)))
;; => [{:username "Alex", :post_id "post1", :body "first post body"}]
```

`limit` does what one would expect:

```sql
SELECT * FROM "user_posts" LIMIT 1;
```

### Tuning Consistency

With Cassandra, it is possible to tune consistency on a per-query basis.
To do that, wrap your database call into `clojurewerkz.cassaforte.policies/with-consistency-level`:

Available consistency levels are:

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

It is clear that `:all` has strongest __Consistency__, but weakest
__Availability__ guarantees, because all the nodes should be up during
the write, whereas `:one` has strongest __Availability__ but weakest
__Consistency__ guarantees, because if the node went down before
replicating data to other nodes, it won't be possible to read it until
the node is back up.

Quorum is calculated as `(replication-factor / 2) + 1` ("the
majority"), so for replication factor of 3, quorum would be 2, which
means that it will tolerate when 1 node is down. For replication
factor of 6, quorum is 4, which tolerates 2 nodes are down.

The values used are application-specific.

Following operation will be performed with consistenct level of `:one`:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.policies :as cp]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cp/with-consistency-level :quorum
    (cql/insert conn :users {:name "Alex" :city "Munich" :age (int 19)})))
```

### Timestamp and TTL

Column values in Cassandra have timestamps associated with them. Even if you do not provide
a timestamp, it is set by Cassandra internally. You can check it by using `cqlsh` or `cassandra-cli`, both of which ship with Cassandra:

```
> cassandra-cli
> list users;
RowKey: Alex
=> (column=, value=, timestamp=1369947837808000)
=> (column=age, value=00000013, timestamp=1369947837808000)
=> (column=city, value=4d756e696368, timestamp=1369947837808000)
```

You can see `timestamp` value set by Cassandra for every column in a
row. In order to make a write with manually set timestamp, you should
use `(using :timestamp)` clause in your query:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/insert conn :users {:name "Alex" :city "Munich" :age (int 19)}
          (using :timestamp (.getTime (java.util.Date.)))))
```

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19) USING TIMESTAMP 1369948317602;
```

Note that when developing applications that rely on timestamp values,
[clock synchronization](http://en.wikipedia.org/wiki/Network_Time_Protocol) across the machines that run Cassandra clienst and nodes is mandatory.

Cassandra itself uses timestamps for conflict resolution. Column value
with has higher timestamp will win over the record with lower
timestamp in case of conflict. You can use arbitrary numbers for
timestamps, but microseconds since Unix Epoch (1970) are used as a
convention.

You can also specify optional TTL (Time To Live) for column values. If
you do so, column values will expire after specified amount of time.


``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/insert conn :users {:name "Alex" :city "Munich" :age (int 19)}
    (using :ttl 60)))
```

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19) USING TTL 60;
```

In this example, the inserted row (technically, all of its column values) will be deleted
in 60 seconds.

When using TTL, you should remember that if you update record with
`(using :ttl)` clause, column livespan will be reset, and counted from
the moment of insert. [Picking TTL values upfront](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/) is a good data modelling practice.


### UUID Functions

`clojurewerkz.cassaforte.uuids` is a namespace that provides various
functions for working with UUIDs, including `:timeuuid` columns:

``` clojure
(require '[clojurewerkz.cassaforte.uuids :as uuids])

(uuids/random)
;= #uuid "d43fdc16-a9c3-4d0f-8809-512115289537"

(uuids/time-based)
;= #uuid "90cf6f40-4584-11e3-90c2-65c7571b1a52"

(uuids/unix-timestamp (uuids/time-based))
;= 1383592179743

(u/start-of (u/unix-timestamp (u/time-based)))
;= #uuid "ad1fd130-4584-11e3-8080-808080808080"

(u/end-of (u/unix-timestamp (u/time-based)))
;= #uuid "b31abb3f-4584-11e3-7f7f-7f7f7f7f7f7f"
```


### Prepared Statements

Prepared statements have same meaning as in relational
databases. Server pases query once, and assigns a unique identifier,
which is cached by clients for future references. Each time query is
executed, only values are passed between client and server. This
reduces an overhead of parsing query each time and amount of data sent
over the network.

For example, a simple query to insert values to the table would be:

```sql
INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);
```

Prepared query would keep `?` placeholders instead of values:

```sql
INSERT INTO users (name, city, age) VALUES (?, ?, ?);
```

In order to execute a prepared query, you can use `client/execute` function:

``` clojure
(client/execute
 (client/as-prepared "INSERT INTO users (name, city, age) VALUES (?, ?, ?);"
                     "Alex" "Munich" (int 19))
 :prepared true)
```

Internally, execute will prepare query or get cached identifier and execute prepared statement
against the cluster. However, we provide a higher-level API for working with prepared statements.
You can wrap any query from `cql` namespace into `client/prepared`, which will execute query as
prepared one:

``` clojure
(client/prepared
 (insert :users {:name "Alex" :city "Munich" :age (int 19)}))
```

If you want to run __all__ queries generated by `cql` or `multi.cql` namespaces as prepared,
you can use `force-prepared-queries` connection option.


#### Paginating Through Results

Pagination with Cassandra can at times be less convenient than with relational databases.
Fortunately, Cassaforte provides a convenience function `clojurewerkz.cassaforte.cql/iterate-table`
that is sufficient for many cases. This section first introduces the strategy used by
Cassaforte and then provides and example of `clojurewerkz.cassaforte.cql/iterate-table` at
the end, so you may want to skip to that.

To paginate through contents of an entire table, it is common to use the so called "token
strategy". Token-based pagination is based on every row having
a special "token" field that sorting can be performed on. Then fetch a
batch of rows, take the last one and to load the next page, use the
token.

To demonstrate, consider the following table:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (create-table conn :users
                (column-definitions {:name :varchar
                                     :age  :int
                                     :city :varchar
                                     :primary-key [:name]})))
```

```sql
CREATE TABLE users (age int, name varchar, city varchar, PRIMARY KEY (name));
```

Add 100 entries to it:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn  (cc/connect ["127.0.0.1"])]
  (dotimes [i 100]
    (cql/insert conn :users {:name (str "name_" i) :city (str "city" i) :age (int i)})))
```

Get the first page:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/select conn :users (limit 10)))
```

```sql
SELECT * FROM users LIMIT 10;
```

This will return us first 10 rows but in random order. This happens
because ordering is only possible when partition key is restricted by
one of the equality operators.

To load the next page ordered, get the `name` (which is a partition
key value in that case) of the last user in the resulting
collection. Say the value was `name_53`. In order to get the next
__page__, you should use `token` function:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (select conn :users
    (where (token :name) [> (token "name_53")])
    (limit 10)))
```

```sql
SELECT * FROM users WHERE token(name) > token('name_53') LIMIT 10;
```

This will return next page in the desired order.

Cassaforte provides a convenience function `clojurewerkz.cassaforte.cql/iterate-table`, which uses lazy sequences to
implement the algorithm described above.

In the example below, we iterate over `users` collection, using `name`
as a partition key, and get `10` results per page:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/iterate-table conn :users [[= :name 10]]))
```


#### Range Queries

In case you use compound keys, you have can perform range queries
efficiently. Here, you can "lock" your partition key using `IN` or
equality operator `=` and perform range queries on the results. It is
possible, because Cassandra stores all entries with same partition key
on same node, which guarantees good performance when retrieving
records.

Consider a `tv_series` table, which will use a
compound key. Partition key will be `series_title`, `episode_id` will also be
part of the key:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn :tv_series
                (column-definitions {:series_title  :varchar
                                     :episode_id    :int
                                     :episode_title :text
                                     :primary-key [:series_title :episode_id]})))
```

```sql
CREATE TABLE tv_series (episode_title text,
                        series_title varchar,
                        episode_id int,
                        PRIMARY KEY (series_title, episode_id));
```

Populate the table:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (dotimes [i 20]
    (cql/insert conn :tv_series {:series_title "Futurama" :episode_id i :episode_title (str "Futurama Title " i)})
    (cql/insert conn :tv_series {:series_title "Simpsons" :episode_id i :episode_title (str "Simpsons Title " i)})))
```

If you lock partition key by using equality `WHERE series_title =
'Futurama'` or `IN` operator: `WHERE series_title IN ('Futurama',
'Simpsons')`, you can perform range queries on `episode_id` (which is
a second part of compound key):

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/select conn :tv_series
          (where :series_title [:in ["Futurama" "Simpsons"]]
                 :episode_id [> 10])))
```

```sql
SELECT * FROM tv_series WHERE series_title IN ('Futurama', 'Simpsons') AND episode_id > 10;
```

In the same manner, you can use `>=`, `>`, `<` and `<=` operators for
performing range queries. In addition, you can query for a closed
range (__from__ .. __to__):

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/select conn :tv_series
          (where :series_title "Futurama"
                 :episode_id [> 10]
                 :episode_id [<= 15])))
```

```sql
SELECT * FROM tv_series WHERE series_title = 'Futurama' AND episode_id > 10 AND episode_id <= 15;
```

### Sorting Results

When partition key is used in query condition, you can also run
queries with `ORDER BY` clause, which will order results by any part
of the key except for the partition key:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/select conn :tv_series
          (where :series_title "Futurama")
          (order-by [:episode_id])))
```

```sql
SELECT * FROM tv_series
  WHERE series_title = 'Futurama'
  ORDER BY episode_id;
```

### Filtering

By default, Cassandra disallows potentially expensive queries, that
involve data filtering on the server side. That is done to run queries
with predictable performance, which is proportional to the amount of
data returned from the server.

<div class="alert alert-error">
It's required to say that, depending on a dataset size, allowing filtering may hurt performance.
</div>

For this example, let's use the `users` table described aboe, and add
index on `age` and `city` to it:

```sql
CREATE TABLE users
  (age int,
   name varchar,
   city varchar,
   PRIMARY KEY (name));
```

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-index conn :users :age)
  (cql/create-index conn :users :city))
```

```sql
CREATE INDEX ON users (age);
CREATE INDEX ON users (city);
```

Now, it is possible to query for all users of certain `age` living in a certain `city` using
`ALLOW FILTERING` clause:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/select conn :users
          (where :city "Munich"
                 :age [> (int 5)])
          (allow-filtering true)))
```

```sql
SELECT * FROM users WHERE city = 'Munich' AND age > 5 ALLOW FILTERING;
```

### Collection Columns

Cassandra tables can have collection columns, that is, columns
of types list, map, and set. To define them with Cassaforte, use
`qbits.hayt.utils/list-type`, `qbits.hayt.utils/map-type`,
and `qbits.hayt.utils/set-type`, respectively:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn :thingies
                (column-definitions {:name :varchar
                                     :test_map  (map-type :varchar :varchar)
                                     :test_set  (set-type :int)
                                     :test_list (list-type :varchar)
                                     :primary-key [:name]})))
```

When data is loaded from Cassandra, Cassaforte will convert the types to
their respective immutable Clojure counterparts.

To add an entry to a map, use the `+` operator and a Clojure map:

``` clojure
(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :thingies
          {:test_map [+ {"key1" "value1"
                         "key2" "value2"}]}
          (where :name "thingie1")))

```

Similarly, to append a value to a list column:

``` clojure
(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :thingies
          {:test_list [+ ["value1"]]}
          (where :name "thingie1")))

```

Note that in the example above we use a vector but a Clojure list could
do, too.

Finally, to add a value to a set:

``` clojure
(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :thingies
          {:test_list [+ #{"value1"}]}
          (where :name "thingie1")))

```

To remove a value from a list column:

``` clojure
(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :thingies
          {:test_list [- ["value1"]]}
          (where :name "thingie1")))

```

Same with a set:

``` clojure
(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :thingies
          {:test_list [- #{"value1"}]}
          (where :name "thingie1")))

```


### Counters

Cassandra supports counter columns (also known as distributed counters). A Counter
column provides an efficient way to count or sum integer values. It is
achieved by using atomic increment/decrement operations on column values.

Counter is a special column type, whose value is a 64-bit (signed)
interger. On write, new value is added (or substracted) to previous
counter value. It should be noted that usual consistency/availability
tradeoffs apply to counter operations. In order to perform a counter
update, Cassandra has to perform a read before write in a background,
therefore updates on counters are slightly slower than regular
updates.

Consider a table (`user_counters`) with `counter` column, and `name` key
for counting user-specific operations, such as amount of operations
performed by the user:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn :user_counters
                (column-definitions {:name :varchar
                                     :user_count  :counter
                                     :primary-key [:name]})))
```

```sql
CREATE TABLE user_counters
  (name varchar,
   user_count counter,
   PRIMARY KEY (name));
```

In order to modify (increment or decrement) counter, you can use the
following DSL syntax:

``` clojure
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/update conn :user_counters
          {:user_count (increment-by 5)}
          (where :name "user1"))
  
  (cql/update conn :user_counters
          {:user_count (decrement-by 5)}
          (where :name "user1")))
```

Which will execute following CQL queries, correspondingly:

```sql
UPDATE user_counters SET user_count = user_count + 5 WHERE name = 'asd';
UPDATE user_counters SET user_count = user_count - 5 WHERE name = 'asd';
```

## Wrapping Up

Cassaforte provides a nice way to use CQL with Cassandra. You can
manipulate insert rows, perform queries, update data, delete data, use
distributed counters.

The rest of this documentation covers more features Cassaforte and
Cassandra provide.


## What to read next

  * [Data Modelling](/articles/data_modelling.html)
  * [Schema Operations](/articles/schema_operations.html)
  * [Key Cassandra Concepts](/articles/cassandra_concepts.html)
  * [Advanced Client Options](/articles/advanced_client_options.html)
