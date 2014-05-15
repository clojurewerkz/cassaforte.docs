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

## Dependency information

Cassaforte artifacts are [released to Clojars](https://clojars.org/clojurewerkz/cassaforte).

### With Leiningen

```clj
[clojurewerkz/cassaforte "1.3.0"]
```

Please note that Cassaforte works with Clojure versions starting from 1.4, to satisfy other
dependency requirements.

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
  <version>1.3.0</version>
</dependency>
```

It is recommended to stay up-to-date with new versions. New releases
and important changes are announced [@ClojureWerkz](http://twitter.com/clojurewerkz).

### Supported Clojure Versions

Cassaforte is built from the ground up for Clojure 1.4 and later.


### Supported Cassaforte Versions

Cassaforte requires Cassandra 1.2+.

## Installing Cassandra

In order to install Cassandra on Mac OS X (with [homebrew](http://brew.sh/)), run:

```sh
brew install cassandra
```

And follow homebrew instructions for starting it.

On Ubuntu, first make sure you're running latest version of 6 or 7 Java:

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

If you want to have a cluster running in VMs, just use [Cassaforte Docs Cluster](https://github.com/ifesdjeen/cassaforte_docs_cluster) setup, that uses Vagrant.

### Enable CQL Support On the Server

In order to use CQL and Cassaforte, you need to enable CQL support. Make sure `start_native_transport` is set to `true` in `cassandra.yaml`:

``` yaml
start_native_transport: true
```

## Connecting To Cassandra

If you're connecting to the single cluster/keyspace, you should use `clojurewerkz.cassaforte.client/connect!` function to connect to Cassandra.
It will set `*default-cluster*` and `*default-session*` for client and use them for all the operations later on. Use `clojurewerkz.cassaforte.cql`
namespace for queries, all operations in this namespace will use a default session (or session you provide in a binding). You can also find
various CQL helper functions are can be found in `clojurewerkz.cassaforte.query`.

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as client]))

;; Will connect to localhost
(client/connect! ["127.0.0.1"])
```

In order to connect to multiple Cassandra cluster nodes, use:

```clj
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as client])
  (:use clojurewerkz.cassaforte.cql
        clojurewerkz.cassaforte.query))

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
  (:use clojurewerkz.cassaforte.multi.cql
        clojurewerkz.cassaforte.query))

;; Build the cluster
(def cluster (client/build-cluster {:contact-points ["127.0.0.1"]
                                    :port 19042}))

;; Connect to the cluster, define a session
(def session (client/connect cluster :my_keyspace))

;; Pass session explicitly
(insert session :users {:name "Alex" :city "Munich"})
```

## Executing raw CQL queries

In order to execute query from the String, you can use `execute` method
directly. We tried our best to provide a DSL that gets out of your way, but
from time to time you may want to write your own CQL query and execute it
as it is, especially useful while working with advanced concepts and queries.

```clj
;; As it was mentioned before, you can omit Session argument, default one will be used instead
(client/execute "INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);")

;; You can pass Session argument explicitly:
(client/execute session "INSERT INTO users (name, city, age) VALUES ('Alex', 'Munich', 19);")
```

If you want to build your own queries in runtime, you can refer our [building custom queries](TBD)
guide.

## Working with Cassaforte

`clojurewerkz.cassaforte.client` is a base namespace for connecting to Cassandra clusters,
configuring your cluster connection, tuning things like Load Balancing, Retries, consistency
and reconnection, rendering queries generated using the DSL, preparing them, working with
asyncronous results.

`clojurewerkz.cassaforte.cql` is a DSL for all CQL operations, that provides a high-level
API for key/value, keyspace, column family, lazy operations, pagination and iterating over
an entire column family.

`clojurewerkz.cassaforte.multi.cql` is a DSL for all CQL operations, that provides same exact
set of operations as `clojurewerkz.cassaforte.cql`, but for work with multiple clusters/keyspaces.

`clojurewerkz.cassaforte.query` CQL operations interface, prepared statement implementation,
convenience functions for key operations built on top of CQL. Includes versions of `cassaforte.cql`
functions that take database as an explicit argument. Use these namespace when you need to work
with multiple databases or manage database and connection lifecycle explicitly.

`clojurewerkz.cassaforte.embedded` provides facility functions for working with an embedded
Cassandra server, which is very useful for testing your application without having a C*
cluster running and for cases when application requires Standalone Cassandra without
additional installation.

We recommend `:require` for `clojurewerkz.cassaforte.cql` namespace (or `clojurewerkz.cassaforte.multi.cql`
in case you want to work with multiple clusters/keyspaces at a time), and `:use` for
`clojurewerkz.cassaforte.query` to keep your namespaces non-polluted. However, you can see
what fits your application better.

## Creating and Updating Keyspaces

Cassandra organizes data in keyspaces. They're somewhat similar to
databases in relational databases.  Typically, you need one keyspace
per application.

```clj
(create-keyspace "cassaforte_keyspace"
                 (with {:replication
                        {:class "SimpleStrategy"
                         :replication_factor 1 }}))
```

```sql
CREATE KEYSPACE "cassaforte_keyspace"
  WITH replication = {'class' : 'SimpleStrategy', 'replication_factor' : 1};
```

This will create new CQL keyspace with simple replication strategy and
replication factor of 1. This is not advised for production.

You can modify keyspace settings with `clojurewerkz.cassaforte.cql/alter-keyspace`:

```clj
(alter-keyspace "cassaforte_keyspace"
                (with {:durable_writes false
                       :replication    {:class "NetworkTopologyStrategy"
                                        :dc1 1
                                        :dc2 2}}))
```

```sql
ALTER KEYSPACE "cassaforte_keyspace"
  WITH durable_writes = false
    AND replication = {'dc1' : 1,
                       'dc2' : 2,
                       'class' : 'NetworkTopologyStrategy'};
```

Before you can use a keyspace, you have to switch to it with `clojurewerkz.cassaforte.cql/use-keyspace`:

```clj
(use-keyspace "cassaforte_keyspace")
```

```sql
USE "cassaforte_keyspace";
```

You can learn more about working with keyspaces in [working with keyspaces guide](TBD)

## Creating and Updating Tables

Cassandra is a column-oriented database. Column Families contain
multiple columns, each of which has a name, a value and a timestamp,
and is referenced by a row key. Column families are roughly equivalent
to tables in relational databases.

In order to create a column family, use `create-table` or `create-column-family`
(both are aliases for the same function):

In order to create a Column Family with a single key, simply pass
primary key name as a keyword in `primary-key` clause:

```clj
(create-table "users"
              (column-definitions {:name :varchar
                                   :age  :int
                                   :primary-key [:name]}))
```

```sql
CREATE TABLE "users" (age int,
                      name varchar,
                      PRIMARY KEY (name));
```

In order to create a composite key, pass a vector holding names of
columns that will become keys:

```clj
(create-table "user_posts"
              (column-definitions {:username :varchar
                                   :post_id  :varchar
                                   :body     :text
                                   :primary-key [:username :post_id]}))
```

```sql
CREATE TABLE "user_posts" (username varchar,
                           body text,
                           post_id varchar,
                           PRIMARY KEY (username, post_id));
```
The user post record will now be identified by `username` and `post_id`.

In order to update an existing column family, use `clojurewerkz.cassaforte.cql/alter-table` or
`cql/alter-column-family`. You can add new columns and rename and change types of the
existing ones:

Change the type of a column to integer:

```clj
(alter-table "users"
             (alter-column :post_id :int))
```

```sql
ALTER TABLE "users" ALTER post_id TYPE int;
```

Add an integer column:

```clj
(alter-table "users"
             (add-column :age :integer))
```

```sql
ALTER TABLE "users" ADD age integer;
```

Rename a column:

```clj
(alter-table "users"
             (rename-column :username :name))
```

```sql
ALTER TABLE "users" RENAME username TO name;
```

## Storing Values

Even though Cassandra is mostly known for it's fault-tolerancy and
performance, it can also store data.

You can insert simple values into your Column Family using
the `clojurewerkz.cassaforte.cql/insert` function:

```clj
(insert "users" {:name "Alex" :age (int 19)})
```

```sql
INSERT INTO "users" (name, age) VALUES ('Alex', 19);
```

However, for performance reasons we highly recommend using prepared
statements.

Prepared statement is parsed on the database side only once, and
stored for further evaluation, during which only prepared statement id
is transferred. Prepared statements will be covered in more detail
in the rest of the guides.

```clj
(client/prepared
   (insert "users" {:name "Alex" :age (int 19)}))
```

You can find an elaborate guide on Prepared Statements in
[Key Value Operations](http://clojurecassandra.info/articles/kv.html#toc_4) guide.

## Fetching Values

The real power of CQL comes in querying. You can use `IN` queries, query
by range or an exact match. Let's populate our users table with some
data and see what we can do.

Most straightforward thing is to select all users:

```clj
(insert "users" {:name "Alex" :city "Munich" :age (int 19)})
(insert "users" {:name "Robert" :city "Berlin" :age (int 25)})
(insert "users" {:name "Sam" :city "San Francisco" :age (int 21)})

(select "users")
;; => [{:name "Robert", :age 25, :city "Berlin"}
;;       {:name "Alex", :age 19, :city "Munich"}
;;       {:name "Sam", :age 21, :city "San Francisco"}]
```

```sql
INSERT INTO "users" (name, city, age) VALUES ('Alex', 'Munich', 19);
INSERT INTO "users" (name, city, age) VALUES ('Robert', 'Berlin', 25);
INSERT INTO "users" (name, city, age) VALUES ('Sam', 'San Francisco', 21);

SELECT * FROM "users";
```

Select user by name:

```clj
(select "users" (where :name "Alex"))
;; => [{:name "Alex", :age 19, :city "Munich"}]
```

```sql
SELECT * FROM "users" WHERE name = 'Alex';
```

Using `IN` query, match any of the values given in vector:

```clj
(select "users"
        (where :name [:in ["Alex" "Robert"]]))
;; => [{:name "Alex", :age 19, :city "Munich"}
;;     {:name "Robert", :age 25, :city "Berlin"}]
```

```sql
SELECT * FROM "users" WHERE name IN ('Alex', 'Robert');
```

Ordering and range queries are not as straightforward as they are
in relational databases, but in order to provide access to data with
predictable latencies and allow best scaling, Cassandra developers
had to take that approach.

Ordering is only possible when partition key is restricted by either
exact match or `IN`. For example, having `user_posts`:

```clj
(insert "user_posts" { :username "Alex" :post_id "post1" :body "first post body"})
(insert "user_posts" { :username "Alex" :post_id "post2" :body "second post body"})
(insert "user_posts" { :username "Alex" :post_id "post3" :body "third post body"})
```

You can't order all the posts by post_id. But if you say that you
want to get all the posts from user Alex and order them by `post_id`,
it's entirely possible:

```clj
;; For clarity, we select :post_id column only
(select "user_posts"
        (columns :post_id)
        (where :username "Alex")
        (order-by [:post_id :desc]))

;; => [{:post_id "post3"}
;;     {:post_id "post2"}
;;     {:post_id "post1"}]
```

```sql
SELECT post_id FROM "user_posts"
  WHERE username = 'Alex'
  ORDER BY post_id desc;
```

Finally, you can use range queries to get a slice of data:

```clj
(select "user_posts"
        (columns :post_id)
        (where :username "Alex"
               :post_id [> "post1"]
               :post_id [< "post3"]))
;; => [{:post_id "post2"}]
```

```sql
SELECT post_id FROM "user_posts"
  WHERE username = 'Alex'
    AND post_id > 'post1'
    AND post_id < 'post3';
```

In order to limit results of your query, you can use limit:

```clj
(select "user_posts" (limit 1))
;; => [{:username "Alex", :post_id "post1", :body "first post body"}]
```

```sql
SELECT * FROM "user_posts" LIMIT 1;
```


## Prepared Statements

You can find an elaborate guide on Prepared Statements in
[Key Value Operations](http://clojurecassandra.info/articles/kv.html#toc_4) guide.

Prepared statements in Cassaforte are evaluated by query DSL generates
a query, replacing all the values with `?` signs. For example

```clj
(client/prepared
 (insert "posts"
         (values {:userid "user1"
                  :posted_at "2012-01-01"
                  :entry_title "Catcher in the rye"
                  :content "Here goes content"})))
```

would generate

```clj
["INSERT INTO posts (userid, posted_at, entry_title, content) VALUES(?, ?, ?, ?);"
 ["user1" "2012-01-01" "Catcher in the rye" "Here goes content"]]
```

Cassaforte checks if query is already in local query cache. If it is, it returns
prepared statement ID for the next step. Otherwise, query is sent to to Cassandra for
processing, when Statement ID is returned, it's cached.

Query ID is passed to the server along with values for the query.

## Wrapping Up

Cassaforte provides a nice way to use CQL with Cassandra. You can manipulate
keyspaces, column families, insert rows, perform queries, delete data and more.

The rest of this documentation covers more features Cassaforte and Cassandra
provide.


## What to read next

  * [Key Cassandra Concepts](/articles/cassandra_concepts.html)
  * [Key Value Operations](/articles/kv.html)
  * [Data Modelling](/articles/data_modelling.html)
  * [Advanced Client Options](/articles/advanced_client_options.html)
  * [Troubleshooting](/articles/troubleshooting.html)
