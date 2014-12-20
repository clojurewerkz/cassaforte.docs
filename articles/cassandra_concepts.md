---
title: "Key Cassandra concepts"
layout: article
---

## About this guide

This guide covers key concepts behind [Apache Cassandra](http://cassandra.apache.org).


## What version of Cassaforte does this guide cover?

This guide covers Cassandra 2.0 concepts and is not specific to Cassaforte
versions.


## Before We Start

Some concepts, especially comparisons with relational databases are
intentionally simplified in this guide. The goal is to make
understanding what Cassandra has to offer easier and to contrast the
approaches it takes compared to relational databases.


## A Bit of History: Cassandra and Dynamo

Cassandra is often referred as one of implementations of ideas in the
[Dynamo Paper](http://www.allthingsdistributed.com/2007/10/amazons_dynamo.html).
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

See the [original Cassandra paper annotated for Cassandra 2.0](http://www.datastax.com/documentation/articles/cassandra/cassandrathenandnow.html)
to learn more.



## Data in Cassandra is Distributed and Replicated

Cassandra is a distributed data store which was designed to be highly
available. For that reason, it replicates data within the cluster. Data in
Cassandra is stored redundantly on multiple nodes. In case a node
fails, its portion of the data is still available for retrieval from a
different node or multiple nodes.

Data in Cassandra is also partitioned: nodes store and serve only a
subset of data, and when new nodes are added to or removed from the
cluster, rebalancing is done in a way that minimizes intra-cluster
traffic.

Cassandra handles network partitions well, so even
when your several nodes become unreachable or unavailable, Cassandra cluster
may still be able to stay available (serve client requests).

Clients can connect to any node to perform any operation: there is no
master nodes in Cassandra.


## Overview

Any distributed system, in particular databases, face several problems:

 * Cluster membership
 * Inter-node communication
 * Load balancing

### Inter-node Communication

nodes should be able to communicate with each other, share (cluster)
state, distribute the data and propagate notifications about system
changes. Nodes ideally should be able to retrieve missing information,
schedule jobs accordingly, transfer state and hand off information
stored while some other nodes are unavailable.

### Load Balancing

When nodes are added toe the system, the load should be
evenly distributed between them.

### Cluster Membership

This can be split into two parts: _Service Discovery_ and _Failure
Detection_.  Service discovery comes into play when you set up a
fresh node, add it to the cluster.  data gets replicated to that
node and it starts receiving requests.  When the node is was taken
down for maintenance, or fails due to an error, this should be
detected as quickly as possible by other members of the cluster.


Many properties of the distributed systems require client libraries to
be smarter. Cassaforte uses [DataStax Java
driver](http://github.com/datastax/java-driver) underneath, which
allows you to connect to the cluster, discover nodes in the cluster,
set up retry and load balancing policies, among other features.


## Key Terms

If you're familiar with Cassandra, you may want to skip this section.

__Keyspace__ is what's usually called database in relational
databases, it holds column families, sets of key-value pairs. __Column
family__ is somewhat close to the table concept from relational
DBs. There're no relations between column families in Cassandra, even
though it is possible to use foreign keys, _there will be no
referencial integrity checks performed_.

Cassandra allows you to scale your database incrementally, by adding more
nodes to the cluster. To decide how data is distributed in a cluster, it relies
on two concepts: consistent hashing and virtual nodes.

In relational databases, scalability is often achieved by 2 factors:

  * __Replication__. You add more nodes, data gets replicated to them,
    which allows you to scale reads.

  * __Sharding__ allows you to distribute writes, depending on the sharding key,
    to one of the machines.

With replication, you still get difficulties when you have write-heavy
application. With shards, depending on how implement them, you will
end up having hotspots, where one shard will be under heavier load than
the rest of cluster. Overhead of moving data to extend shards is also on
you.

## Consistent Hashing

[Consistent Hashing](http://en.wikipedia.org/wiki/Consistent_hashing)
is a kind of hashing that minimizes the number of elements that need
to be re-mapped when a hash table is resized.  It uses a hash function
underneath (e.g. MD5 or SHA-1) is then used to determine what cluster node
the object belongs to.

For a straightforward explanation of consistent hashing,
see [The Simple Magic of Consistent Hashing](http://www.paperplanes.de/2011/12/9/the-magic-of-consistent-hashing.html) by Mathias Meyer.

## Virtual Nodes

Virtual nodes allow you to go even further, by splitting the ring
(hashing range) into a greater amount of chunks. Each node gets
configured, depending on how many virtual nodes it may hold, and
moving data becomes even easier.

Virtual nodes in Cassandra were [introduced in version 1.2](http://www.datastax.com/dev/blog/virtual-nodes-in-cassandra-1-2).


## Columnar Data Model

Unlike Dynamo, which is a pure key/value store, Cassandra's data model
is heavily influenced by Google's [Big Table](http://static.googleusercontent.com/external_content/untrusted_dlcp/research.google.com/es//archive/bigtable-osdi06.pdf)
data model. Data is stored in column families.

### Column Families

A column family is a container for rows, that is somewhat similar to a
table in a relational database. Each column family has a name, which
it is referenced by.

Rows have a row key (primary key) and zero or more columns. Unlike
relational databases, each row can have its own number of columns (up
to 2 billion), even in the same column family.

Column values (cells) have timestamps associated with them. This means
they can expire. Expired cells are considered to be deleted. This is a very
useful feature for time series modelling.


## CQL 3 Mapping to Cassandra Data Model

CQL 3 makes Cassandra seem much closer to a relational database. However, the data
model used under the hood is still the columnar mode described above. With CQL 3.0,
Cassandra provides a more familiar interface that builds on the same internal machinery.

To lean how it works and what limitations CQL 3 has, see [The CQL 3/Cassandra Mapping](http://www.slideshare.net/DataStax/understanding-how-cql3-maps-to-cassandras-internal-data-structure).


## Partitioning

See [Introducing the Partitioning Process](https://academy.datastax.com/courses/understanding-cassandra-architecture/introducing-partitioning-process)
and [Understanding Request Coordination](https://academy.datastax.com/courses/understanding-cassandra-architecture/understanding-request-coordination) in DataStax Academy.


## Tunable Consistency

Consistency levels in Cassandra can be configured per request
to manage availability versus data consitency (accuracy).

See [Introducing Consistency Levels](https://academy.datastax.com/courses/understanding-cassandra-architecture/introducing-consistency-levels)
and [Understanding Tunable Consistency](https://academy.datastax.com/courses/understanding-cassandra-architecture/understanding-tunable-consistency) in DataStax Academy.


## Gossip Protocol

The gossip protocol is a protocol that Cassandra nodes use to discover information about other
nodes in the cluster. Because this information is transferred from node to the node it knows about,
such protocols are know as "gossip" or "epidemic".

See [Cassandra Node-based Architecture](https://academy.datastax.com/courses/understanding-cassandra-architecture/introducing-cassandras-node-based-architecture)
and [Internode Communications](https://academy.datastax.com/courses/understanding-cassandra-architecture/introducing-internode-communications) in DataStax Academy.


## Hinted Handoff

Hinted handoff is a recovery mechanism that allows nodes temporarily store writes that target other
nodes that are down or unreachable.

See [Understanding Hinted Handoff](https://academy.datastax.com/courses/understanding-cassandra-architecture/understanding-hinted-handoff)
in DataStax Academy.


## Wrapping Up

Cassandra is heavily influenced by the Dynamo paper and Big Table's data model
and combines many prominent ideas in distributed system research.
It provides a way to tune CAP properties however the developer sees fit.


## Related Materials

 * [Cassandra Architecture in Brief](http://www.datastax.com/documentation/cassandra/2.0/cassandra/architecture/architectureIntro_c.html)
 * [Cassandra Architecture Overview](http://wiki.apache.org/cassandra/ArchitectureOverview)
 * [Understanding Dynamo](http://nosqltapes.com/video/understanding-dynamo-with-andy-gross) (video)
 * [Riak Compared to Cassandra](http://docs.basho.com/riak/1.2.1/references/appendices/comparisons/Riak-Compared-to-Cassandra/)


## What to Read Next

  * [Advanced Client Options](/articles/advanced_client_options.html)
  * [Troubleshooting](/articles/troubleshooting.html)
