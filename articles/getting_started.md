---
title: "Getting Started with Clojure and Cassandra"
layout: article
---

## About this guide

This guide is will allow you to quick-start with Cassaforte. It includes the
basic information required to get you up and running.

Cassaforte is a Clojure Cassandra client built around CQL. Thrift API is not
supported. Cassaforte provides DSL for generating and executing CQL queries,
but also allows you to fiddle with dynamic query composition.

All the examples in this and all other Cassaforte guides will be given in form
of explanatory text, followed by Clojure example and raw CQL example, where
it is applicable.


## What version of Cassaforte does this guide cover?

This guide covers Cassaforte 2.0 (including preview releases).


## Adding Cassaforte Dependency To Your Project

Cassaforte artifacts are [released to Clojars](https://clojars.org/clojurewerkz/cassaforte).

### With Leiningen

```clj
[clojurewerkz/cassaforte "2.0.0"]
```

Please note that Cassaforte works with Clojure versions starting from
1.6, to satisfy other dependency requirements.

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
  <version>2.0.0</version>
</dependency>
```

It is recommended to stay up-to-date with new versions. New releases
and important changes are announced [@ClojureWerkz](http://twitter.com/clojurewerkz).

### Supported Clojure Versions

Cassaforte requires Clojure 1.6+.


### Supported Cassaforte Versions

Cassaforte requires Cassandra 2.0. The most recent release is is recommended.


## Installing Cassandra

In order to install Cassandra on Mac OS X (with [homebrew](http://brew.sh/)), run:

```sh
brew install cassandra
```

And follow [Homebrew](http://brew.sh/) instructions for starting it.

On Ubuntu, first make sure you're running Java 7 or later:

```sh
java -version
```

Add the following line to your `/etc/apt/sources.list`:

```
deb http://debian.datastax.com/community stable main
```

Add Datastax repository key to your trusted keys:

```sh
curl -L http://debian.datastax.com/debian/repo_key | sudo apt-key add -
```

And install package:

```sh
sudo apt-get update
sudo apt-get install dsc20
```

This will start the service automatically.

If you want to have a cluster running in VMs, just use [Cassaforte
Docs Cluster](https://github.com/ifesdjeen/cassaforte_docs_cluster)
setup, that uses Vagrant.


### Enable CQL Support

In order to use CQL and Cassaforte, you need to enable CQL
support. Make sure `start_native_transport` is set to `true` in
`cassandra.yaml`:

``` yaml
start_native_transport: true
```

## Connecting To Cassandra

To connect to a cluster, use
`clojurewerkz.cassaforte.client/connect`:

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as cc]))

;; Will connect to localhost
(cc/connect ["127.0.0.1"])
```

In order to connect to multiple Cassandra cluster nodes, list
simply them in a collection:

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as cc]))

;; Will connect to 3 nodes
(cc/connect ["127.0.0.1" "localhost" "another.node.local"])
```

Options can be passed after seed node list:

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as cc]))

(cc/connect ["127.0.0.1"] {:keyspace "myapp_development" :protocol-version 2})
```

## Cassaforte API Overview

`clojurewerkz.cassaforte.client` namespace contains functions for
connecting to Cassandra clusters, configuring your cluster connection,
tuning load balancing strategy, retries strategy,
consistency level and reconnection, and so on. It also contains fundamental
functions that execute queries, although they are considered to be low-level and
rarely need to be used directly.

`clojurewerkz.cassaforte.cql` is the primary namespace for CQL
operations. It provides a high-level API for key key/value operations,
schema operations, pagination, iteration over tables, and so on.

`clojurewerkz.cassaforte.query` provides the building blocks of the query DSL
used by functions in `clojurewerkz.cassaforte.cql`. Functions in this namespace
are usually referred to in the current namespace (using `:refer`).

`clojurewerkz.cassaforte.query` builds on top of [Hayt](https://github.com/mpenet/hayt) 2.0.

## Two Ways to Execute Queries

Cassaforte is built around CQL. There are two ways to run CQL queries: "raw" (as strings)
and "standard" (using a DSL based on [Hayt](https://github.com/mpenet/hayt)).

## Executing Raw CQL Queries

"Raw" CQL queries (executed using strings) can be executed using
`clojurewerkz.cassaforte.client/execute` function:

```clj
(cc/execute session "INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);")
```

## Creating Keyspaces

Cassandra organizes data in keyspaces. They're somewhat similar to
databases in relational databases. Typically one keyspace is used by
one application.

``

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query    :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-keyspace conn "cassaforte_keyspace"
                   (with {:replication
                          {:class "SimpleStrategy"
                           :replication_factor 1}})))
```

will execute the following query:

```sql
CREATE KEYSPACE "cassaforte_keyspace"
  WITH replication = {'class' : 'SimpleStrategy', 'replication_factor' : 1};
```

This will create new CQL keyspace with simple replication strategy and
replication factor of 1. Note that this replication factor is not
advised for production.

## Switching Keyspaces

Before you can use a keyspace, you have to switch to it with
`clojurewerkz.cassaforte.cql/use-keyspace`:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/use-keyspace conn "cassaforte_keyspace"))
```

which will use the following CQL:

```sql
USE "cassaforte_keyspace";
```


## Creating and Updating Tables

Cassandra historically is a column-oriented database but CQL 3 makes its data
model look a lot more familair to relational database users. Data is stored
in tables, which are collections of rows identified by a primary key and composed
of multiple columns. [How exactly CQL 3 maps to internal column-oriented model in Cassandra](http://www.opensourceconnections.com/blog/2013/07/24/understanding-how-cql3-maps-to-cassandras-internal-data-structure/) is outside of the scope of this guide.

To create a table, use `create-table` function.
To to create a table with a single primary key, specify
it in `primary-key` in column definitions:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn "users"
                (column-definitions {:name :varchar
                                     :age  :int
                                     :primary-key [:name]})))
```

The example above will execute the following CQL:

```sql
CREATE TABLE "users" (age int,
                      name varchar,
                      PRIMARY KEY (name));
```

To create a table with a composite primary key, pass a vector holding the names of
columns that the key will be composed of:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-table conn "user_posts"
                (column-definitions {:username :varchar
                                     :post_id  :varchar
                                     :body     :text
                                     :primary-key [:username :post_id]})))
```

The example above will execute the following CQL:


```sql
CREATE TABLE "user_posts" (username varchar,
                           body text,
                           post_id varchar,
                           PRIMARY KEY (username, post_id));
```

User posts will now be identified by both `username` and `post_id`.

## Updating Tables

In order to update an existing table, use
`clojurewerkz.cassaforte.cql/alter-table`. You can add new columns and
rename and change types of the existing ones:

Change the type of a column to integer:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/alter-table conn "users"
               (alter-column :post_id :int)))
```

The example above will execute

```sql
ALTER TABLE "users" ALTER post_id TYPE int;
```

Here's how to add an integer column:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/alter-table conn "users"
               (add-column :age :integer)))
```

this will execute

```sql
ALTER TABLE "users" ADD age integer;
```

It is possible to rename a column:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]
            [clojurewerkz.cassaforte.query :refer :all]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/alter-table conn "users"
               (rename-column :username :name)))
```

which will use the following CQL:

```sql
ALTER TABLE "users" RENAME username TO name;
```

## Inserting Rows

To insert a row in a table, use `clojurewerkz.cassaforte.cql/insert`:

```clj
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

## Querying Cassandra

The real power of CQL comes in querying. You can choose between equality queries,
`IN` queries, and range queries.

The examples in this section need some data to be in the "users" table:

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

The above example will execute the following CQL:

```sql
INSERT INTO "users" (name, city, age) VALUES ('Alex', 'Munich', 19);
INSERT INTO "users" (name, city, age) VALUES ('Robert', 'Berlin', 25);
INSERT INTO "users" (name, city, age) VALUES ('Sam', 'San Francisco', 21);
```

### Unconditional Query

First, a query that returns rows unconditionally:

```clj
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

### Equality Query

Next, query a user by name:

```clj
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

### IN Queries

Next, query for rows that match any of the values from a collection (the so so-called `IN` query):

```clj
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

### Sorting Results

Sorting and range queries in Cassandra have limitations compared to
relational databases. Sorting is only possible when partition key is restricted by either
exact match or `IN`. For example, having these `user_posts`:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn  (cc/connect ["127.0.0.1"])
      table "users_posts"]
  (cql/insert conn "user_posts" { :username "Alex" :post_id "post1" :body "first post body"})
  (cql/insert conn "user_posts" { :username "Alex" :post_id "post2" :body "second post body"})
  (cql/insert conn "user_posts" { :username "Alex" :post_id "post3" :body "third post body"}))
```

You can't sort all the posts by `post_id`. But if you say that you want
to get all the posts from user Alex and sort them by `post_id`, it's
possible:

```clj
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

### Range Queries

Finally, you can use range queries to get a slice of data:

```clj
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

In order to limit results of a query, use the `limit` clause:

```clj
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

## Using Prepared Statements

Prepared statements are parsed on the database side only once, and
stored for further execution, during which only prepared statement id
is transferred. Prepared statements will be covered in more detail in
the rest of the guides.

To execute a group of queries using prepared statements, wrap them
in `clojurewerkz.cassaforte.client/prepared`:

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cc/prepared
     (cql/insert conn "users" {:name "Alex" :age (int 19)})))
```

Learn more about prepared statements in the
[CQL Operations](http://clojurecassandra.info/articles/cql.html) guide.

## Wrapping Up

Cassaforte provides a nice way to use CQL with Cassandra. You can manipulate
keyspaces, table, insert rows, perform queries, delete data, and execute
raw CQL queries for when you need to do things Cassaforte's DSL is not very
well suited for.

The rest of this documentation covers more features Cassaforte and
Cassandra provide.


## What to read next

  * [Working with Cassandra Using CQL](/articles/cql.html)
  * [Schema Operations](/articles/schema_operations.html)
  * [Key Cassandra Concepts](/articles/cassandra_concepts.html)
  * [Advanced Client Options](/articles/advanced_client_options.html)
