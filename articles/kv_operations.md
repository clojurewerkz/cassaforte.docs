---
title: "Key/Value Operations"
layout: article
---

## About this guide

This guide explains more complex Key/Value operations, such as

  * Insertion, querying and deletion of values
  * Indexing
  * Consistency levels
  * Retry Policies
  * TTL for entries
  * Batch Operations
  * Counters
  * Range Queries
  * Collection types

This guide relies on things that are also mentioned in [Advanced Client Options](/articles/advanced_client_options.html) guide.

## Inserting values

Cassandra is a key-value store. That means that even though more sophisticated queries are somewhat possible, they are not
a main reason to use it. Most of the use-cases are related to storing items by key, wether it's a simple or compound key.

When modelling schema in Cassanra, it is important to understand your read patterns, since it will make it way easier for
you to retrieve values in future. So first advise would be to model your data around your query patterns.
