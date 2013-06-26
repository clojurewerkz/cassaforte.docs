---
title: "Data Modelling"
layout: article
---

## About this guide

This guide explains how to model your data "Cassandra Way". There're several concepts that you can utilize to
ease access to your data.

Most of the things you can do in Cassandra are rather straightforward. But from time to time, I'm still hearing
similar questions, especially ones about pagination, range queries and flexible schema. This guide covers all
these approaches, explaining basic features that can be used to achieve desired results.

## Static Tables

If you have single-lookup entries, such as users table, use a simple key. For example, you have a table that stores user
data, where users are accessed by unique `name` identifier.

```sql
CREATE TABLE users (age int, name varchar, city varchar, PRIMARY KEY (name));
```

In this example, let's say we have following values within our table:

```
|    :name | :age |      :city |
|----------+------+------------|
| Nicholas |   20 |      Paris |
|   Robert |   22 |     Berlin |
|  Matthew |   31 |     Zurich |
|      Max |   34 |   New York |
|    Viola |   27 |   Portland |
|     Alex |   20 |     Munich |
|     Lisa |   19 |       Kiev |
|      Dan |   23 | Dusseldorf |
|  Ingress |   25 |      Tokio |
|  Michael |   30 |     Moscow |
```

You won't be able to do any range queries, you will only be able to paginate across values storing the last item, for example:

```sql
SELECT * FROM users LIMIT 5;
```

Returns the first page (5 entries) of user data:

```
 name     | age | city
----------+-----+----------
 Nicholas |  20 |    Paris
   Robert |  22 |   Berlin
  Matthew |  31 |   Zurich
      Max |  34 | New York
    Viola |  27 | Portland
```

In order to retrieve the next page, you'd have to query by token, because internally Cassandra can only perform token comparison.
Here, you should take the last entry key and run token query against database:

```sql
SELECT * FROM users WHERE token(name) > token('Viola') LIMIT 5;
```

Which returns next 5 items:

```
 name    | age | city
---------+-----+------------
    Alex |  20 |     Munich
    Lisa |  19 |       Kiev
     Dan |  23 | Dusseldorf
 Ingress |  25 |      Tokio
 Michael |  30 |     Moscow
```

That's pretty much a how you can implement pagination within your application. You can't perform any sorting, only top-to-bottom
paginagion across the items.

In essence, one thing you should never do is full table scans. Most of the things you query for should be constrainted by
primary key. One of the examples may be an event log for the users. For example, you want to log event ocurrences for particular
user, when he logs in, logs out, or writes a message to anothey user. In that case, you may want to have user's `name` as
a partition key, and let's say `created_at` as a second part of the key.

## Using Compound Keys

In current Cassandra terminology, term __Compound Key__ is used to describe entries that are identified
by the set of keys. This terms is used to avoid ambiguity with Composite Columns that were used in previous
versions of Cassandra.

Queries with locked partition key are not expensive, since you can guarantee that things that
have same partition key will be located on the same node.

```sql
CREATE TABLE user_events (created_at timestamp, name varchar, event_type varchar, PRIMARY KEY (name, created_at));
```

```
 name | created_at               | event_type
------+--------------------------+-------------
 Alex | 2012-01-01 12:20:00+0100 |   logged_in
 Alex | 2012-01-01 12:25:00+0100 | new_message
 Alex | 2012-01-01 12:30:00+0100 | new_message
 Alex | 2012-01-01 12:35:00+0100 |   new_reply
 Alex | 2012-01-01 12:40:00+0100 |  logged_out
 Alex | 2012-01-01 15:30:00+0100 |   logged_in
```

In that case, you have an ability to perform range query, locking partition key on certain user and specifying a range:

```sql
SELECT * FROM user_events WHERE name='Alex' AND created_at > '2012-01-01 12:20' AND created_at < '2012-01-01 12:40';
```

```
 name | created_at               | event_type
------+--------------------------+-------------
 Alex | 2012-01-01 12:25:00+0100 | new_message
 Alex | 2012-01-01 12:30:00+0100 | new_message
 Alex | 2012-01-01 12:35:00+0100 |   new_reply
```

## Dynamic Tables

__Dynamic Column Families__ is something that is more specific to Cassandra.
It is related to the Wide Rows concept. Let's say we need to store information
about how the movie was rated. For that, we create a `movies` table with a
_composite key_, that consists of `title` and `time`, when it was rated. We'll use
`rating` column to store rating for the given time.

```sql
CREATE TABLE movies (title varchar, rating int, time timestamp, PRIMARY KEY (title, time));
```

Now let's take a closer look on how the information is stored:

```
|   row key    |                                columns                                      |
|--------------+-------------------------|-------------------------|-------------------------|
|              | 1368284297711:"rating"  | 1368284468993:"rating"  | 1368284474188:"rating"  |
| Pulp Fiction +-------------------------|-------------------------|-------------------------|
|              |           9             |           10            |           6            |
|--------------+-------------------------|-------------------------|-------------------------|
|              | 1368284605867:"rating"  | 1368284612339:"rating"  | 1368284617643:"rating"  |
|   Futurama   +-------------------------|-------------------------|-------------------------|
|              |           5             |           8             |           10            |
|--------------+-------------------------|-------------------------|-------------------------|
```

And so on. In this case we've treated both `time` and `rating` columns as values. You can go further
and use one of them as something that's looks more like a key. For example, you can store data about
organizations pretty much the same way. In this example, we'll have a table called `people`, that
holds `name` of the person, `company` he works for, `field_name` (which is set by application, that
could be anything, like 'address' or 'phone').

If you think of data the way we initially described it (`company` holds `people`, that can have
some information about them stored in arbirary fields), you can represent it as:


```
|   row key    |                                columns                                      |
|--------------+-------------------------|-------------------------|-------------------------|
|              |  "John Smith":"phone"   | "John Smith":"address"  | "Jane Anderson":"phone" | ...
|  Company A   +-------------------------|-------------------------|-------------------------|
|              |    +1 123 456 789       |    Sunny Boulevard 154  |    +1 675 434 44 55     | ...
|--------------+-------------------------|-------------------------|-------------------------|
|              |  "Nick Jumbo":"phone"   |   "Andrew Hoe":"phone"  | "Jeffrey May":"address" | ...
|  Company B   +-------------------------|-------------------------|-------------------------|
|              |    +1 314 568 133       |    +1 853 235 382       |    Strange Loop 382     | ...
|--------------+-------------------------|-------------------------|-------------------------|
```

It's kind of a phone book, but you may have artibrary fields for things like phone, address and so on.
Note that any person may have both phone or address, or just one of them. It's up to application and
user to decide what to store in those columns.

All you need is to have a composite key. Of course, same exact table could be represented as:

```
|      name     | field_name  |     field_value     |  company  |
|---------------+-------------+---------------------+-----------|
|    John Smith |       phone |      +1 123 456 789 | Company A |
|    John Smith |     address | Sunny Boulevard 154 | Company A |
| Jane Anderson |       phone |    +1 675 434 44 55 | Company A |
|    Nick Jumbo |       phone |      +1 314 568 133 | Company B |
|    Andrew Hoe |       phone |      +1 853 235 382 | Company B |
|   Jeffrey May |     address |    Strange Loop 382 | Company B |
```

But thinking of your data in multiple dimentions will open many alternatives to the way you
approach your data.

That should give you a basic idea on how to model things.

## General advices

Good things to remember while modelling your data would be:

  * Structure everything around __partition key__, so that entries that belong together would
    be stored on same nodes
  * Denormalize everything, based on reading patterns. If certain things are retrieved together,
    store them together.
  * When necessary, use __Dynamic Tables__. In that case you're able to utilize internal storage
    in the best way, using values within column names. Cassaforte provides resources for mapping
    Dynamic Tables back to straightforward structure.
  * When using __Dynamic Tables__ or __Compound Keys__, you're able to perform range queries
    with locked partition key, and achieve some flexibility in terms of querying. Make sure
    that you don't go wild with these, though. It's a nice feature, but if you're trying to
    squeeze large amounts of data just for sakes of being able to perform range queries, you
    may want to split it to smaller chunks or reconsider your reading patterns.
  * Make sure that your keys do not collide. That is especially applicable to time-series.
    You may end up overwriting some parts of the data.
