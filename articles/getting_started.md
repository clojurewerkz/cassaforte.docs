---
title: "Getting Started with Clojure and Cassandra"
layout: article
---

## About this guide

This guide is will allow you to quick-start with Cassaforte. It includes the
basic information required to get you up and running.

## Overview

Cassaforte is a Clojure Cassandra client built around CQL. Thrift API is not
supported.

Although Cassaforte lets you fiddle with byte buffers and custom serialization, it is
a high level client by design.


## Adding Cassaforte Dependency To Your Project

Cassaforte artifacts are [released to Clojars](https://clojars.org/clojurewerkz/cassaforte).

### With Leiningen

```clojure
[clojurewerkz/cassaforte "1.0.0-rc4"]
```

### With Maven

Add Clojars repository definition to your `pom.xml`:

``` xml
<repository>
  <id>clojars.org</id>
  <url>http://clojars.org/repo</url>
</repository>
```

And then the dependency:

``` xml
<dependency>
  <groupId>clojurewerkz</groupId>
  <artifactId>cassaforte</artifactId>
  <version>1.0.0-rc4</version>
</dependency>
```

It is recommended to stay up-to-date with new versions. New releases
and important changes are announced [@ClojureWerkz](http://twitter.com/clojurewerkz).

## Supported Clojure Versions

Cassaforte is built from the ground up for Clojure 1.4 and later.


## Supported Cassaforte Versions

Cassaforte requires Cassandra 1.2+.



## Enable CQL Support On the Server

In order to use CQL and Cassaforte, you need to enable CQL support. Make sure `start_native_transport` is set to `true` in `cassandra.yaml`:

``` yaml
start_native_transport: true
```

## Connecting To Cassandra

If you're connecting to the single cluster/keyspace, you should use `clojurewerkz.cassaforte.cql/connect!` function to connect to Cassandra.
It will set `*default-cluster*` and `*default-session*` for client and use them for all the operations later on. Use `clojurewerkz.cassaforte.cql`
namespace for queries, all operations in this namespace will use a default session (or session you provide in a binding).

```clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as client]))

;; Will connect to localhost
(client/connect! "127.0.0.1")
```

In order to connect to multiple Cassandra cluster nodes, use:

```clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as client])
  (:use clojurewerkz.cassaforte.cql))

;; Will connect to 3 nodes in a cluster
(client/connect! ["127.0.0.1" "localhost" "another.node.local"])

;; Default session is used for the query
(insert :users {:name "Alex" :city "Munich"})
```

## Connecting to multiple clusters/keyspaces

If you want to connect to multiple clusters, or have several keyspaces you're working with simultaneously, you should use `clojurewerkz.cassaforte.multi.cql`
namespace for all the operations. In order to make a connection, use `client/build-cluster` and `client/connect` functions to create a `Cluster` and `Session`
instance, correspondingly.

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as client])
  (:use clojurewerkz.cassaforte.multi.cql))

;; Build the cluster
(def cluster (client/build-cluster {:contact-points ["127.0.0.1"]
                                    :port 19042}))

;; Connect to the cluster, define a session
(def session (client/connect :my_keyspace))

;; Pass session explicitly
(insert session :users {:name "Alex" :city "Munich"})
```
## Key Namespaces

Main query execution interface is in the `clojurewerkz.cassaforte.cql`
namespace. Various CQL helper functions are can be found in
`clojurewerkz.cassaforte.query`.


## Working with Keyspaces

### Creating and Updating Keyspaces

Cassandra organizes data in keyspaces. They're somewhat similar to
databases in relational databases.  Typically, you need one keyspace
per application.

We recommend `:require` for `clojurewerkz.cassaforte.cql` namespace,
and `:use` for `clojurewerkz.cassaforte.query` to keep your namespaces
non-polluted. However, you can see what fits your application better.

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/create-keyspace "cassaforte_keyspace"
                     (with {:replication
                            {:class "SimpleStrategy"
                             :replication_factor 1 }}))
```

This will create new CQL keyspace with simple replication strategy and
replication factor of 1. This is not advised for production.

You can modify keyspace settings with `clojurewerkz.cassaforte.cql/alter-keyspace`:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/alter-keyspace "cassaforte_keyspace"
                    (with {:durable_writes false
                           :replication    {:class "NetworkTopologyStrategy"
                                            :dc1 1
                                            :dc2 2}}))
```

Before you can use a keyspace, you have to switch to it with `clojurewerkz.cassaforte.xql/use-keyspace`:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/use-keyspace "cassaforte_keyspace")
```

You can learn more about working with keyspaces in [working with keyspaces guide](TBD)


### Creating and Updating Column Families

Cassandra is a column-oriented database. Column Families contain
multiple columns, each of which has a name, a value and a timestamp,
and is referenced by a row key. Column families are roughly equivalent
to tables in relational databases.

In order to create a column family,
use `clojurewerkz.cassaforte.cql/create-table` or
`clojurewerkz.cassaforte.cql/create-column-family` (both are aliases
for the same function):

In order to create a Column Family with a single key, simply pass
primary key name as a keyword in `primary-key` clause:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/create-table "users"
                  (column-definitions {:name :varchar
                                       :age  :int
                                       :primary-key [:name]}))
```

In order to create a composite key, pass a vector holding names of
columns that will become keys:

```clojure
(cql/create-table "user_posts"
                  (column-definitions {:username :varchar
                                       :post_id  :varchar
                                       :body     :text
                                       :primary-key [:username :post_id]}))
```

The user post record will now be identified by `username` and `post_id`.

In order to update an existing column family, use `clojurewerkz.cassaforte.cql/alter-table` or
`cql/alter-column-family`. You can add new columns and rename
and change types of the existing ones:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

;; Change the type of a column to integer
(cql/alter-table "users"
                 (alter-column :post_id :int))

;; Add an integer column
(cql/alter-table "users"
                 (add-column :age :integer))

;; Rename a column
(cql/alter-table "users"
                 (rename-column :username :name))
```


## Storing Values

Even though Cassandra is mostly known for it's fault-tolerancy and
performance, it can also store data.

You can insert simple values into your Column Family using
the `clojurewerkz.cassaforte.cql/insert` function:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/insert "users" {:name "Alex" :age (int 19)})
```

However, for performance reasons we highly recommend using prepared
statements.

Prepared statement is parsed on the database side only once, and
stored for further evaluation, during which only prepared statement id
is transferred. Prepared statements will be covered in more detail
in the rest of the guides.

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/prepared
   (cql/insert "users" {:name "Alex" :age (int 19)}))

```


## Fetching Values

The real power of CQL comes in querying. You can use `IN` queries, query
by range or an exact match. Let's populate our users table with some
data and see what we can do.

Most straightforward thing is to select all users:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/insert "users" {:name "Alex" :city "Munich" :age (int 19)})
(cql/insert "users" {:name "Robert" :city "Berlin" :age (int 25)})
(cql/insert "users" {:name "Sam" :city "San Francisco" :age (int 21)})

(cql/select "users")
;; => [{:name "Robert", :age 25, :city "Berlin"}
       {:name "Alex", :age 19, :city "Munich"}
       {:name "Sam", :age 21, :city "San Francisco"}]
```

Select user by name:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/select "users" (where :name "Alex"))
;; => [{:name "Alex", :age 19, :city "Munich"}]
```

Using `IN` query, match any of the values given in vector:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/select "users"
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
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/insert "user_posts"
            {:username "Alex"
             :post_id  "post1"
             :body     "first post body"})

(cql/insert "user_posts"
            {:username "Alex"
             :post_id  "post2"
             :body     "second post body"})

(cql/insert "user_posts"
            {:username "Alex"
             :post_id  "post3"
             :body     "third post body"})
```

You can't order all the posts by post_id. But if you say that you
want to get all the posts from user Alex and order them by `post_id`,
it's entirely possible:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

;; For clarity, we select :post_id column only
(cql/select "user_posts"
            (columns :post_id)
            (where :username "Alex")
            (order-by [:post_id :desc]))
;; => [{:post_id "post3"}
       {:post_id "post2"}
       {:post_id "post1"}]
```

Finally, you can use range queries to get a slice of data:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/select "user_posts"
            (columns :post_id)
            (where :username "Alex"
                   :post_id [> "post1"]
                   :post_id [< "post3"]))
;; => [{:post_id "post2"}]
```

In order to limit results of your query, you can use limit:

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/select "user_posts" (limit 1))
;; => [{:username "Alex", :post_id "post1", :body "first post body"}]
```


## Prepared Statements

TBD: what even are prepared statements

Prepared statements in Cassaforte are evaluated by query DSL generates
a query, replacing all the values with `?` signs. For example

```clojure
(require '[clojurewerkz.cassaforte.cql :as cql])

(cql/insert "posts"
            (values {:userid "user1"
                     :posted_at "2012-01-01"
                     :entry_title "Catcher in the rye"
                     :content "Here goes content"}))
```

would generate

```clojure
["INSERT INTO posts (userid, posted_at, entry_title, content) VALUES(?, ?, ?, ?);"
 ["user1" "2012-01-01" "Catcher in the rye" "Here goes content"]]
```

Cassaforte checks if query is already in local query cache. If it is, it returns
prepared statement ID for the next step. Otherwise, query is sent to to Cassandra for
processing, when Statement ID is returned, it's cached.

Query ID is passed to the server along with values for the query.

TBD



## Wrapping Up

Cassaforte provides a nice way to use CQL with Cassandra. You can manipulate
keyspaces, column families, insert rows, perform queries, delete data and more.

The rest of this documentation covers more features Cassaforte and Cassandra
provide.


## What to read next

  * [Key Cassandra Concepts](/articles/cassandra_concepts.html)
  * [Advanced Client Options](/articles/advanced_client_options.html)
  * [Troubleshooting](/articles/troubleshooting.html)
