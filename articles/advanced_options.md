---
title: "Advanced Client Options"
layout: article
---

## About this guide

This guide covers client settings most relevant in production settings. It will address
issues with reconnection, load-balancing, retries, compression, tunable write/read consistency
levels and so on.


## Reconnection

When the network connection fails, there is more than one way to handle it.
Cassaforte can schedule reconnection according to the given reconnection policy.

Internally, the DataStax driver receives and distributes notifications Cluster detects that node
is up or down via StateListener. At any given point in time it is possible to check wether host
is up or down by checking `clojurewerkz.cassaforte.client/get-hosts` `is-up` key.

Reconnection uses an internal schedules that relies on one of:

`Exponential Policy` - waits exponentially longer between reconnection attempts. Once maximum
delay is reached, delay won't grow anymore.

```clojure
(require '[clojurewerkz.cassaforte.client :as client])

(client/exponential-reconnection-policy 100 1000)
```

This will create a reconnection policy that you can pass into Cluster Builder, with 100 milliseconds
of base delay that will exponentially increase until it reaches 1000 milliseconds.

`Constant Reconnectoin Policy` - waits for the fixed period of time between reconnection attempts.

```clojure
(client/constant-reconnection-policy 100)
```

Will wait for 100 milliseconds between reconnection attempts.

## Retry

If connection to the host is in order, but query still fails, it is important to set an optimal
query retry policy.

`DefaultRetryPolicy` is a conservative, safe retry policy that will not decrease consistency
level for query to succeed. It will retry queries in two cases:

  * __on timed out read__, if enough replicas responded, but data still was not retrieved, which
    usually means that some of the nodes chosen by coordinator are dead but were not detected
    as such just yet.
  * __on timed out write__, only if it occured during writing to distributed batch log. It is very likely that
    coordinator picked unresponsive nodes that were not yet detected as dead..

Under some circumstances, it makes sense to tune the consistency level for the subsequent write.
This way you sacrifice consistency for availability. Operation will still be considered as sucessful,
even though smaller amount of replicas were used for the operation.

For cases like that, you may use `DowngradingConsistencyPolicy`. It will retry query:

  * __on timed out read__, if at least one replica responded, but consistency level was not met (amount
    of replicas that responded is smaller than requested consistency level). Read will be
    retried with lower consistency level.
  * __for unlogged batch queries__, it will retry with lower consistency level if at least one replica
    acknowledged the write. For other operations, timeout is ignored.
  * if coordinator node notices that there's __not enough replicas__ alive to satisfy query, execute
    same query with lower consistency level.

You should understand __very well__ that this policy should only be used when tradeoff of writing
data to the smaller amount of nodes is acceptable. Also, that sometimes data won't be even
possible to read that way, because tradeoff was made and guarantees have changed. Reads
with lower consistency level may increase chance of reading stale data.

<div class="alert alert-error">
It is strongly recommended to wrap `DowngradingConsistencyPolicy` policy into `LoggingRetryPolicy`.
</div>

`FallthroughRetryPolicy` should be used if you want to take care of retries yourself in
business logic code. Please refer to [Exception Handling](/articles/exception_handling.html) guide
for more details about what exception types to be aware of.
