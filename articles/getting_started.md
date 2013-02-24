---
title: "Getting Started"
layout: article
---

## About this guide

This guide is will allow you to quick-start with Cassaforte. All the basic information required to get you up and running is here.

## Overview

There are several high-level clients for Java, but we found them all
very limiting when working in Clojure environment. You have to
maintain many paradigms that are very foreign to Clojure.

Even though Cassaforte has a bit of Java underneath, we provided you
with a set of abstractions that can get you to any level: you can go
ahead and operate byte-buffers yourself, use built-in deserialization
mechanisms, operate Cassandra-specific classes like
ColumnFamilyDefinition and others, or use helper functions that
transform them into readable Clojure maps and give you fast and easy
access to what you want.

You will see examples with both CQL and Thrift abstractions. Most of
time, there is almost no difference. For exqmple, CQL does not support
supercolumns, they were replaced in favor of (composite column
names)[https://issues.apache.org/jira/browse/CASSANDRA-3237]. Thrift
interface still supports them. Bare Thrift is known to be more
performant, and CQL is known to be user-friendly. We support both,
so you could pick whichever one you like.

## Connecting to Cassandra

Cassaforte supports multiple connections. *Do not try* to reuse once
connection between threads, as `Cassandra.Client` is not thread-safe.

https://gist.github.com/ac0eda880c34c0b86849

TODO: Implement and document with-client here

## How to create keyspace

### Thrift

TBD

### CQL

TBD

## How to create column family

### Thrift

TBD

### CQL

TBD

### Batch mutations
