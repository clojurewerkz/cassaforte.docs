---
title: "Key Cassandra concepts"
layout: article
---

## About this guide

This guide covers key concepts behind [Apache Cassandra](http://cassandra.apache.org).


## Before We Start

Some concepts, especially comparisons with relational databases are intentionally
simplified in this guide. The goal is to make understanding what Cassandra has to offer
easier and to contrast the approaches it takes compared to relational databases.


## A Bit of History: Cassandra and Dynamo

Cassandra is often referred as one of implementations of ideas in the
[Dynamo
Paper](http://www.allthingsdistributed.com/2007/10/amazons_dynamo.html).
Some things, that are more applicable to Cassandra, will be covered in
this guide. In order to understand the underlying concepts, reading
the paper itself would be very valuable. Note that Cassandra in some
ways is very different from Dynamo.

Dynamo was arguably the first large scale data store to fully embrace the [CAP Theorem](http://en.wikipedia.org/wiki/CAP_theorem),
which states that for the distributed system it's impossible to
simultaneously provide Consistency, Availability and Partition Tolerance.
Cassandra allows you to increase system availability by embracing so called
[Eventual Consistency](http://www.allthingsdistributed.com/2008/12/eventually_consistent.html).
Nevertheless, it is possible to get strong consistency, by trading off
an increase in latency.



## Cassandra is Distributed and Replicated

Cassandra is a distributed data store and designed to be highly available. For
that, it replicates data within the cluster. The data is stored
redundantly on multiple nodes. In case one node fails, data is still
available for retrieval from a different node or multiple nodes.

Cassandra starts making most sense when your data is rather big. Because it
was built for distribution, you can scale your reads and writes, and fine-tune and
manage your database `consistency` and `availability`. Cassandra handles network partitions
well, so even when your several nodes are unavailable for some time, you will still
be able to easily recover from that.


## Overview

Any distributed system, be it a database, computing backend, or web application
is facing several problems:

  * __Load Balancing__: if you have more than one node in the system, the load should
    be evenly distributed between the workers.

  * __Cluster Membership__ is solved by two parts: _Service Discovery_ and _Failure Detection_.
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


## Key Terms

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
second one - from 3 to 5 and so on. Data will be moved the node where it belongs,
accoding to the hash function and new number of nodes. This also means
that there will be no manual labour involved.

## Virtual Nodes

Virtual Nodes allow you to go even further, by splitting the Ring into the larger
amount of chunks. Each node gets configured, depending on how many Virtual Nodes
it may hold, and moving data becomes even easier.


## Data Model

Unlike Dynamo, which is a pure key/value store, Cassandra's data model
is heavily influenced by Google's [Big
Table](http://static.googleusercontent.com/external_content/untrusted_dlcp/research.google.com/es//archive/bigtable-osdi06.pdf)
data model with column families.

### Column Families

A column family is a container for rows, that is somewhat similar to a table
in a relational database. Each column family has a name, which it is referenced
by. In this guide, terms column family and table will be used interchangeably.

Cassandra has `static` and `dynamic` column families. Static column
families are simple, you specify a fixed schema for the column family, add
data according to the schema, and alter whenever the application requires it.


## Wrapping Up

Cassandra is heavily influenced by the Dynamo paper and Big Table's data model
and combines many prominent ideas in distributed system research.
It provides a way to tune CAP properties however the developer sees fit.


## What to Read Next

  * [Data Modelling](/articles/modelling_data.html)
  * [Advanced Client Options](/articles/advanced_client_options.html)
  * [Troubleshooting](/articles/troubleshooting.html)
