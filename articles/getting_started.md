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

You will see examples with both CQL and Thrift interfaces. Most of
time, there is almost no difference. For exqmple, CQL does not support
supercolumns, they were replaced in favor of [composite
keys](https://issues.apache.org/jira/browse/CASSANDRA-3237). Thrift
interface still supports them. Bare Thrift is known to be more
performant, and CQL is known to be user-friendly. We support both, so
you could pick whichever one you like.

If you're upgrading from older Cassandra versions and plan to use CQL3,
start [here](http://www.datastax.com/dev/blog/thrift-to-cql3). If you
want to keep using tables, created with CQL3 via Thrift interface
(for example, for Hadoop/Cascading tasks), you can use
[COMPACT STORAGE](https://issues.apache.org/jira/browse/CASSANDRA-4924)

## Adding Cassaforte Dependency To Your Project

Cassaforte artifacts are released to Clojars.

### With Leiningen

```clojure
[clojurewerkz/cassaforte "1.3.1"]
```

It is recommended to stay up-to-date with new versions. New releases
and important changes are announced [@ClojureWerkz](http://twitter.com/clojurewerkz).

## Using Native CQL Transport

### Connecting To Cassandra
`clojurewerkz.cassaforte.cql/connect!` function connects to Cassanfra
using Native CQL transport.

In order to connect to Cassandra, use:

```clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.cql :as cql]))

;; Connects using SimpleClient, provided by Cassandra developers
(cql/connect! "127.0.0.1")

;; Connects with a clustered driver
(cql/connect! ["node1" "node2" "node3" ])
```

### Creating and updating Keyspaces

Cassandra stores data in Keyspaces. They're somewhat similar to
Databases in SQL databases.  Typically, one Keyspace is used for an
application. CQL helper functions are exposed through
`clojurewerkz.cassaforte.query` namespace. Main query interface for
execution is `clojurewerkz.cassaforte.cql`.

We recommend `:require` for `clojurewerkz.cassaforte.cql` namespace,
and `:use` for `clojurewerkz.cassaforte.query` to keep your namespaces
non-polluted. However, you can see what fits your application better.


```clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.cql :as cql])
  (:use clojurewerkz.cassaforte.query))

(cql/create-keyspace :new_cql_keyspace
                     (with {:replication
                            {:class "SimpleStrategy"
                             :replication_factor 1 }}))
```

This will create new CQL keyspace with simple replication strategy and
replication factor of 1. This is not advised for production.

You can modify keyspace by using alter-keyspace:

```clojure
(alter-keyspace :new_cql_keyspace
                  (with {:durable_writes true}))
```

Switch to keyspace:

```clojure
(use-keyspace :new_cql_keyspace)
```

You can learn more about working with keyspaces in [working with keyspaces guide](TBD)

### Creating and updating Column Families

Column Families contain multiple columns, each of which has a name,
value and timestamp, and is referenced by row key. In order to create
a Column Family, use `cql/create-table` or `cql/create-column-family`,
which is an alias for the former one.

In order to create a Column Family with a single key, simply pass
primary key name as a keyword in `primary-key` clause:

```clojure
(cql/create-table :posts
                  (column-definitions {:userid :text
                                       :posted_at :timestamp
                                       :content :text
                                       :content :text
                                       :primary-key :userid}))
```

In order to create a composite key, pass a vector holding names of
columns that will become keys:

```clojure
:primary-key [:userid :posted_at]
```

Full example:

```clojure
(cql/create-table :posts
                  (column-definitions {:userid :text
                                       :posted_at :timestamp
                                       :entry_title :text
                                       :content :text
                                       :primary-key [:userid :posted_at]}))
```

## Storing values

Even though Cassandra is mostly known for it's fault-tolerancy and
performance, it can also store data.

You can insert simple values into your Column Family using
`cql/insert` function:

```clojure
(cql/insert :posts
            (values {:userid "user1"
                     :posted_at "2012-01-01"
                     :entry_title "Catcher in the rye"
                     :content "Here goes content"})
            (using :timestamp (.getTime (new java.util.Date))
                   :ttl 200000))
```


However, for performance reasons we highly recommend using prepared
statements.

Prepared statement is parsed on the database side only once, and
stored for further evaluation, during which only prepared statement id
is transferred. If you want to learn more about prepared statements,
refer to [working with data](TBD) guide.

```clojure
(prepared
 (cql/insert :blobs
             (values {:id "blob1"
                      :created_at (java.util.Date. 112 0 i 1 0 0)
                      :blob your-binary-data-here})))
```

## Fetching values



## Thrift

TBD

## CQL

TBD

# How to create column family

## Thrift

TBD

## CQL

TBD

## Batch mutations
