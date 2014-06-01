---
title: "Cassandra Schema Operations with Clojure"
layout: article
---

## About this guide

This guide covers Cassandra schema management with Cassaforte:

 * Operations on keyspaces
 * Operations on tables


## What version of Cassaforte does this guide cover?

This guide covers Cassaforte 2.0 (including preview releases).


## Creating Keyspaces

Cassandra organizes data in keyspaces. They're somewhat similar to
databases in relational databases. Typically one keyspace is used by
one application.

``

```clj
(ns cassaforte.docs
  (:require [clojurewerkz.cassaforte.client :as cc]
            [clojurewerkz.cassaforte.cql    :as cql]))

(let [conn (cc/connect ["127.0.0.1"])]
  (cql/create-keyspace conn "cassaforte_keyspace"
                   (with {:replication
                          {:class "SimpleStrategy"
                           :replication_factor 1 }})))
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
