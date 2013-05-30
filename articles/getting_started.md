---
title: "Getting Started"
layout: article
---

## About this guide

This guide is will allow you to quick-start with Cassaforte. All the
basic information required to get you up and running is here.

## Overview

There are several high-level clients for Java, but we found them all
very limiting when working in Clojure environment. You have to
maintain many paradigms that are very foreign to Clojure.

Even though Cassaforte has a bit of Java underneath, we provided you
with a set of abstractions that can get you to any level: you can go
ahead and operate byte-buffers yourself, use built-in deserialization
mechanisms, operate Cassandra internal classes, or use helper
functions that transform them into readable Clojure maps and give you
fast and easy access to what you want.

Cassaforte only works with Thrift interface. We have worked on some
prototypes for Thrift, too, but decided to drop Thrift support and
make the client future-proof. One of the frequently mentioned differences
between Thrift and CQL protocols is support of supercolumns, since they were
replaced in favor of [composite keys](https://issues.apache.org/jira/browse/CASSANDRA-3237)
in CQL.

If you're upgrading from older Cassandra versions and plan to use CQL3,
start [here](http://www.datastax.com/dev/blog/thrift-to-cql3). If you
want to keep using tables, created with CQL3 via Thrift interface
(for example, for Hadoop/Cascading tasks), you can use
[COMPACT STORAGE](https://issues.apache.org/jira/browse/CASSANDRA-4924).

## Adding Cassaforte Dependency To Your Project

Cassaforte artifacts are released to Clojars.

### With Leiningen

```clojure
[clojurewerkz/cassaforte "1.0.0-rc3"]
```

It is recommended to stay up-to-date with new versions. New releases
and important changes are announced [@ClojureWerkz](http://twitter.com/clojurewerkz).

## Enable CQL support on the server

Cassaforte works with native CQL protocol, and works with Cassandra 1.2+.
In order to enable native CQL, make sure `start_native_transport` is set to `true` in `cassandra.yaml`
(which is usually located under `/etc/cassandra`).

```
start_native_transport: true
```

## Connect To Cassandra

`clojurewerkz.cassaforte.cql/connect!` function connects to Cassanfra.

In order to connect to Cassandra cluster, use:

```clojure
(ns cassaforte.docs.examples
  (:require clojurewerkz.cassaforte.client)
  (:use clojurewerkz.cassaforte.cql
        clojurewerkz.cassaforte.query))

;; Will connect to 3 nodes in a cluster
(client/connect! ["node1" "node2" "node3"])
```

### Create and update Keyspaces

Cassandra stores data in Keyspaces. They're somewhat similar to
Databases in SQL databases.  Typically, one Keyspace is used for an
application. CQL helper functions are exposed through
`clojurewerkz.cassaforte.query` namespace. Main query interface for
execution is `clojurewerkz.cassaforte.cql`.

We recommend `:require` for `clojurewerkz.cassaforte.cql` namespace,
and `:use` for `clojurewerkz.cassaforte.query` to keep your namespaces
non-polluted. However, you can see what fits your application better.

```clojure
(cql/create-keyspace :cassaforte_keyspace
                     (with {:replication
                            {:class "SimpleStrategy"
                             :replication_factor 1 }}))
```

This will create new CQL keyspace with simple replication strategy and
replication factor of 1. This is not advised for production.

You can modify keyspace by using alter-keyspace:

```clojure
(cql/alter-keyspace :cassaforte_keyspace
                    (with {:durable_writes false
                           :replication    {:class "NetworkTopologyStrategy"
                                            :dc1 1
                                            :dc2 2}}))
```

Switch to keyspace, in order to start with Column Families within the keyspace:

```clojure
(cql/use-keyspace :cassaforte_keyspace)
```

You can learn more about working with keyspaces in [working with keyspaces guide](TBD)

### Create and update Column Families

Column Families contain multiple columns, each of which has a name,
value and timestamp, and is referenced by row key. In order to create
a Column Family, use `cql/create-table` or `cql/create-column-family`,
which is an alias for the former one.

In order to create a Column Family with a single key, simply pass
primary key name as a keyword in `primary-key` clause:

```clojure
(cql/create-table :users
                  (column-definitions {:name :varchar
                                       :age  :int
                                       :primary-key [:name]}))
```

In order to create a composite key, pass a vector holding names of
columns that will become keys:

```clojure
(cql/create-table :user_posts
                  (column-definitions {:username :varchar
                                       :post_id  :varchar
                                       :body     :text
                                       :primary-key [:username :post_id]}))
```

User Post record will now be identified by `username` and `post_id`.

In order to update an existing Column Family, use `cql/alter-table` or
`cql/alter-column-family`. This way you can add new columns and rename
and change type of existing ones:

```clojure
;; Change the type of post_id to integer
(cql/alter-table :users
                 (alter-column :post_id :int))

;; Add column age of type integer
(cql/alter-table :users
                 (add-column :age :integer))

;; Rename username column to name
(cql/alter-table :users
                 (rename-column :username :name))
```

## Store values

Even though Cassandra is mostly known for it's fault-tolerancy and
performance, it can also store data.

You can insert simple values into your Column Family using
`cql/insert` function:

```clojure
(cql/insert :users {:name "Alex" :age (int 19)})
```

However, for performance reasons we highly recommend using prepared
statements.

Prepared statement is parsed on the database side only once, and
stored for further evaluation, during which only prepared statement id
is transferred. If you want to learn more about prepared statements,
refer to [working with data](TBD) guide.

```clojure
(prepared
   (cql/insert :users {:name "Alex" :age (int 19)}))
```
## Fetch values

CQL offers some querying opportunities. You can use `IN` queries, query
by range or an exact match. Let's populate our users table with some
data and see what we can do.

Most straightforward thing is to select all users:

```clojure
(cql/insert :users {:name "Alex" :city "Munich" :age (int 19)})
(cql/insert :users {:name "Robert" :city "Berlin" :age (int 25)})
(cql/insert :users {:name "Sam" :city "San Francisco" :age (int 21)})

(cql/select :users)
;; => [{:name "Robert", :age 25, :city "Berlin"}
       {:name "Alex", :age 19, :city "Munich"}
       {:name "Sam", :age 21, :city "San Francisco"}]
```

Select user by name:

```clojure
(cql/select :users (where :name "Alex"))
;; => [{:name "Alex", :age 19, :city "Munich"}]
```

Using `IN` query, match any of the values given in vector:

```clojure
(cql/select :users
            (where :name [:in ["Alex" "Robert"]]))
;; => [{:name "Alex", :age 19, :city "Munich"}
       {:name "Robert", :age 25, :city "Berlin"}]
```

Ordering and range queries are not as straightforward as they are
in relational databases, but in order to provide access to data with
predictable latencies and allow best scaling, Cassandra developers
had to take that approach.

Ordering is only possible when partition key is restricted by either
exact match or `IN`. For example, having `user_posts`:

```clojure
(cql/insert :user_posts
            {:username "Alex"
             :post_id  "post1"
             :body     "first post body"})

(cql/insert :user_posts
            {:username "Alex"
             :post_id  "post2"
             :body     "second post body"})

(cql/insert :user_posts
            {:username "Alex"
             :post_id  "post3"
             :body     "third post body"})
```

You can't order all the posts by post_id. But if you say that you
want to get all the posts from user Alex and order them by `post_id`,
it's entirely possible:

```clojure
;; For clarity, we select :post_id column only
(cql/select :user_posts
            (columns :post_id)
            (where :username "Alex")
            (order-by [:post_id :desc]))
;; => [{:post_id "post3"}
       {:post_id "post2"}
       {:post_id "post1"}]
```

Finally, you can use range queries to get a slice of data:

```clojure
(cql/select :user_posts
            (columns :post_id)
            (where :username "Alex"
                   :post_id [> "post1"]
                   :post_id [< "post3"]))
;; => [{:post_id "post2"}]
```

In order to limit results of your query, you can use limit:

```clojure
(cql/select :user_posts (limit 1))
;; => [{:username "Alex", :post_id "post1", :body "first post body"}]
```

## What to read next

  * [Cassandra key concepts](/articles/cassandra_key_concepts.html) guide
  * [Advanced Client Options](/articles/advanced_client_options.html) guide
  * [Troubleshooting](/articles/troubleshooting.html) guide
