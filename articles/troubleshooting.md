---
title: "Troubleshooting"
layout: article
---

## About this guide

It's clear that things are not always going smooth, and it's very useful to understand what's actually
going on, and whose fault it may be. Whether you've built a query that Cassandra can't execute, or
driver generates an incorrect query. We provide several ways to debug these things, and can share
our own experience on how to debug Cassandra issues.

## Trouble with driver

In order to understand why your queries don't get through, you want to use `clojurewerkz.cassaforte.client/with-debug`
macro. For example, let's try to create same exact keyspace twice from Clojure repl:

```clojure
(use 'clojurewerkz.cassaforte.cql
     'clojurewerkz.cassaforte.query
     'clojurewerkz.cassaforte.client)

(connect! ["127.0.0.1"])

(with-debug
  (dotimes [i 2]
    (create-keyspace :new_cql_keyspace
                     (with {:replication
                            {:class "SimpleStrategy"
                             :replication_factor 1 }}))))
```

Of course, this will fail, but you'll be able to see what exactly is going on in your REPL:

```
com.datastax.driver.core.exceptions.AlreadyExistsException: Keyspace new_cql_keyspace already exists
 at com.datastax.driver.core.exceptions.AlreadyExistsException.copy (AlreadyExistsException.java:82)
    com.datastax.driver.core.ResultSetFuture.extractCauseFromExecutionException (ResultSetFuture.java:234)
    com.datastax.driver.core.ResultSetFuture.getUninterruptibly (ResultSetFuture.java:165)
    com.datastax.driver.core.Session.execute (Session.java:106)
    com.datastax.driver.core.Session.execute (Session.java:75)
```

Same macro will also give you an output of the query that was built:

```
Built query:  CREATE KEYSPACE new_cql_keyspace WITH replication = {'class' : 'SimpleStrategy', 'replication_factor' : 1};
```

## Using command line tools

### cqlsh

Let's start with `cqlsh`. This is a CQL Shell, that allows you to execute arbitrary CQL commands and
see their ouput. To start using it, either install Cassandra locally and run `cqlsh` from bin directory
of C* installation. Or install a standalone cqlsh by installing python, pip and running:

```
pip install cql PyYAML
```

Let's start with creating a keyspace and two tables, one with a single key and second one with composite key.

```sql
CREATE KEYSPACE new_cql_keyspace
  WITH replication = {'class' : 'SimpleStrategy', 'replication_factor' : 1};

USE new_cql_keyspace;

CREATE TABLE users
  (age int,
   name varchar,
   city varchar,
   PRIMARY KEY (name));

CREATE TABLE user_posts
 (username varchar,
  body text,
  post_id varchar,
  PRIMARY KEY (username, post_id));
```

Now, let's put a tiny bit of data into it:

```sql
INSERT INTO users (name, age, city) VALUES ('Alex', 19, 'Munich');
INSERT INTO users (name, age, city) VALUES ('Robert', 30, 'Berlin');

INSERT INTO user_posts (username, post_id, body) VALUES ('Alex', 'Alex Post 0', 'Alex Body 0');
INSERT INTO user_posts (username, post_id, body) VALUES ('Alex', 'Alex Post 1', 'Alex Body 1');
INSERT INTO user_posts (username, post_id, body) VALUES ('Alex', 'Alex Post 2', 'Alex Body 2');

INSERT INTO user_posts (username, post_id, body) VALUES ('Robert', 'Robert Post 0', 'Robert Body 0');
INSERT INTO user_posts (username, post_id, body) VALUES ('Robert', 'Robert Post 1', 'Robert Body 1');
INSERT INTO user_posts (username, post_id, body) VALUES ('Robert', 'Robert Post 2', 'Robert Body 2');
```

Now, you can start running queries against the database:

```sql
SELECT * FROM users;
```

Will return

```
 name   | age | city
--------+-----+--------
 Robert |  30 | Berlin
   Alex |  19 | Munich
```

This is a very useful tool for running queries in a fast way.

### cassandra-cli

Cassandra-cli is particularly useful when you want to understand how the data is stored in Cassandra.
This is a rather oldschool tool, but is still useful.

Run `cassandra-cli` from shell, and switch to the newly created keyspace:

```
use new_cql_keyspace;
list users;
```

Output would look like:

```
-------------------
RowKey: Robert
=> (column=, value=, timestamp=1368308975438000)
=> (column=age, value=0000001e, timestamp=1368308975438000)
=> (column=city, value=4265726c696e, timestamp=1368308975438000)
-------------------
RowKey: Alex
=> (column=, value=, timestamp=1368308922871000)
=> (column=age, value=00000019, timestamp=1368308922871000)
=> (column=city, value=4d756e696368, timestamp=1368308922863000)
```

This looks is more or less straightforward. You can see that there're two records,
with keys `Robert` and `Alex`, each one of them has `age` and `city` columns.
It doesn't help if you wanted to see actual values, of course, but here you can
see timestamps and understand wether certain columns were updated in an unexpected way.

If you do similar check for `user_posts` table, results will be very different.

```
list user_posts;
-------------------
RowKey: Robert
=> (column=Robert Post 0:, value=, timestamp=1368309965842000)
=> (column=Robert Post 0:body, value=526f6265727420426f64792030, timestamp=1368309965842000)
=> (column=Robert Post 1:, value=, timestamp=1368309965846000)
=> (column=Robert Post 1:body, value=526f6265727420426f64792031, timestamp=1368309965846000)
=> (column=Robert Post 2:, value=, timestamp=1368309966477000)
=> (column=Robert Post 2:body, value=526f6265727420426f64792032, timestamp=1368309966477000)
-------------------
RowKey: Alex
=> (column=Alex Post 0:, value=, timestamp=1368309965830000)
=> (column=Alex Post 0:body, value=416c657820426f64792030, timestamp=1368309965830000)
=> (column=Alex Post 1:, value=, timestamp=1368309965833000)
=> (column=Alex Post 1:body, value=416c657820426f64792031, timestamp=1368309965833000)
=> (column=Alex Post 2:, value=, timestamp=1368309965836000)
=> (column=Alex Post 2:body, value=416c657820426f64792032, timestamp=1368309965836000)
```

What you see here is a `dynamic` column family, or so-called wide rows. CQL hides this abstraction
from us, but from time to time it's still helpful to see how the data is represented, especially if
you're using both Thrift and CQL interfaces.

Here, we got 2 rows with keys 'Alex' and 'Robert' in return. You see that value of `post_id`, together
with column name `body` is used as a composite key. Here, for example, `Alex Post 0:body`, will
hold an actual value for `body`.


## Moving to CQL

If you're upgrading from older Cassandra versions and plan to use CQL3,
start [here](http://www.datastax.com/dev/blog/thrift-to-cql3). If you
want to keep using tables, created with CQL3 via Thrift interface
(for example, for Hadoop/Cascading tasks), you can use
[COMPACT STORAGE](https://issues.apache.org/jira/browse/CASSANDRA-4924).
