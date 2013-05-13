---
title: "Cassandra key concepts"
layout: article
---

## Cassandra who?

Some concepts, especially comparisons with relational databases are intentionally
simplified in this guide. Purpose is not to teach anyone how to scale MySQL or any
other relational data store, but rather contrast approaches.

Cassandra is a replicated and distributed. That implies that data is stored
redundantly on multiple nodes, which makes an entire system more reliable. In case
one node fails, data is still available for retrieval from the different node.

Cassandra starts making most sense when your data is rather big. Because it
was built for distribution, you can scale your reads and writes, and fine-tune and
manage your database `consistency` and `availability`. Cassandra handles network partitions
well, so even when your several nodes are unavailable for some time, you will still
be able to easily recover from that.

Any distributed system, be it a database, computing backend, or web application
is facing several problems:

  * __Load Balancing__: if you have more than one node in the system, the load should
    be evenly distributed between the workers.

  * __Membership problem__ is solved by two parts: _Service Discovery_ and _Failure Detection_.
    Service Discovery comes into play when you set up a fresh node, add it to the cluster.
    Data gets replicated to that node and it starts receiving writes and serving reads.
    When the node has left the cluster, was taken down for maintenance, or shut down due
    to an error, and later recovered from the failure or was brought back after maintenance,
    it should join the cluster again automatically, otherwise maintenance overhead will
    be to large, and there will always be a rather large chunk of manual labour.

  * __Inter-node communication__: nodes should be able to communicate with each other,
    share internal information, distribute the data or inform about system changes. Nodes
    are able to retrieve missing information, schedule jobs accordingly, transfer state
    and hand off information stored while peer was unavailable.

Many properties of the distributed systems require client to be smarter. Cassaforte
uses [DataStax java-driver](github.com/datastax/java-driver) underneath, which allows
you to connect to the cluster, discover nodes in the cluster, set up retry and load
balancing policies, among other features.

## Cassandra and Dynamo

Cassandra is often referred as one of implementations inspired by [Dynamo Paper](http://www.allthingsdistributed.com/2007/10/amazons_dynamo.html). In order to understand underlying concepts, I suggest reading
paper itself. Some things, that are more applicable to Cassandra, will be covered in this guide.

When people talk about Dynamo, they often refer to [CAP Theorem](http://en.wikipedia.org/wiki/CAP_theorem),
which states that for the distributed system it's impossible to
simultaneously provide Consistency, Availability and Partition Tolerance.
Cassandra allows you to increase system Availability by  having so called
[Eventual Consistency](http://www.allthingsdistributed.com/2008/12/eventually_consistent.html).
Nevertheless, it is possible want to get strong consistency, by cost of
an increased latency.

## Key concepts

If you're familiar with Cassandra, you may want to skip this section.
Here we'll mention Cassandra-specific concepts, that may be not familiar
for the newcomers.

__Keyspace__ is what's usually called Database in relational databases, it
holds Column Families, sets of key-value pairs. __Column family__ is somewhat
close to the Table concept from relational DBs. There're no relationships
enforced between Column Families in Cassandra, even though you may build
your own foreign keys, _there will be no checks performed_ during writes
and deletes to ensure integrity. You'll have to implement these things
yourself.

Cassandra allows you to scale your database incrementally, by adding more
nodes to the cluster. For that, it uses Consistent Hashing and Virtual Nodes.

In relational databases, scalability is often achieved by 2 factors:

  * __Replication__. You add slaves, that get replicated data from master,
    which allows you to scale reads.

  * __Sharding__. It allows you to distribute data, depending on the sharding key,
    to one of the machines.

With replication, you still get difficulties when you have write-heavy
application. With shards, depending on how implement them, you will
end up having hotspots, where one shard will be under heavier load than
the rest of cluster. Overhead of moving data to extend shards is also on
you.

## Consistent Hashing

By using __Consistent Hashing__, you can solve this problem in a more elegant
way. Having a (very) large set of values form a Ring, each node takes over
some range of a ring (think: angle). Hash function is then used to
determine which node the object belongs to.

To simplify the concept, let's say you have a Ring of values from 0 to 11,
and 3 nodes. First node will handle reads and writes for values from 0 to 3,
second one - 4 to 7, third one - 8 to 11. Now, we have keys from 0 to 11, and
new write comes with a key 5. By calculating 5 modulo 4, we get 1, which means
that write will have to go to the node second node (counting from 0).

Now, whenever a new machine is added to the cluster, the cluster will have
to get rebalanced. Now, first node will take care of range from 0 to 2,
second one - from 3 to 5 and so on. Data will move to the node where it belongs,
accoding to the hash function and new number of nodes. This also means
that there will be no manual labour involved.

## Virtual Nodes

Virtual Nodes allow you to go even further, by splitting the Ring into the larger
amount of chunks. Each node gets configured, depending on how many Virtual Nodes
it may hold, and moving data becomes even easier.

## Column Families

Column family is a container for Rows, that is somewhat similar to the Table
in relational database. Each column family has a name, which it is referenced
by. Name consists of alphanumeric characters, starting with a letter. In
this guide, terms Column Family and Table will be used interchangeably.

In Cassandra, there are `static` and `dynamic` column families. Static column
families are simple, you specify a fixed schema for the column family, add
data according to the schema, and alter whenever the application requires it.

### Static Tables

For example, let's create a table called `users`.

```sql
CREATE TABLE users (name varchar, city varchar, PRIMARY KEY (name));
```

Data will be stored in a rather straightforward way:

```
|   name  |  city  |
|---------+--------|
|    Alex | Munich |
| Michael | Moscow |
```

This will create a table `users`, which will contain fixed set of fields, such
as `name` and `city`. Whenever we have to add another column to the table,
for example, `age`, we execute Alter query:

```sql
ALTER TABLE users ADD age int;
```

This way we can make schema flexible, but there's nothing special about it,
you may say.

### Dynamic Tables

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
