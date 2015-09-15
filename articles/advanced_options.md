---
title: "Advanced Client Options"
layout: article
---

## About this guide

This guide covers client settings most relevant in production
settings. It will address issues with reconnection, load-balancing,
retries, tunable consistency levels, and so on.

## What version of Cassaforte does this guide cover?

This guide covers Cassaforte 2.0 (including preview releases).


## Reconnection Policies

When network connection fails, there is more than one way to handle
it. Cassaforte can schedule reconnection according to the given
reconnection policy.

Internally, the DataStax driver receives and distributes notifications
about nodes in the cluster being down or up.

There are 2 reconnection policies supported out of the box:

 * Exponential policy
 * Constant policy

### Exponential policy

Exponential policy waits exponentially longer between reconnection
attempts. Once maximum delay is reached, delay won't grow anymore.

`clojurewerkz.cassaforte.policies/exponential-reconnection-policy` is used
to instantiate the policy:

```clojure
(require '[clojurewerkz.cassaforte.policies :as cp])

(cp/exponential-reconnection-policy 100 1000)
```

### Constant reconnection policy

Constant reconnection policy waits for the fixed period of time
between reconnection attempts.

`clojurewerkz.cassaforte.policies/constant-reconnection-policy` is used
to instantiate the policy:


```clojure
(cp/constant-reconnection-policy 100)
```

The policy above will wait for 100 milliseconds between reconnection
attempts.


## Load Balancing Policies

Cassaforte supports 3 load balancing policies:

 * Round robin
 * Data center aware round robin
 * Token aware

Use `clojurewerkz.cassaforte.policies/round-robin-policy`,
`clojurewerkz.cassaforte.policies/dc-aware-round-robin-policy`, and
`clojurewerkz.cassaforte.policies/token-aware-policy` functions to
instantiate them:

``` clojure
(require '[clojurewerkz.cassaforte.policies :as cp])

(cp/round-robin-policy)
;= RoundRobinPolicy instance

(cp/dc-aware-round-robin-policy "local-dc-name")
;= DCAwareRoundRobinPolicy instance
```

Token-aware policy takes another policy and wraps it:

``` clojure
(require '[clojurewerkz.cassaforte.policies :as cp])

(let [p (cp/round-robin-policy)]
  (cp/token-aware-policy p))
```


## Default Consistency Levels

TBD


## Retry Policies

If connection to the host is in order, but query still fails, it is
important to set an optimal query retry policy.

Cassaforte supports 3 policies out of the box:

 * Default
 * Downgrading consistency
 * Fall through

Default is a conservative, safe retry policy that will not decrease consistency
level for query to succeed. It will retry queries in two cases:

  * __on timed out read__, if enough replicas responded, but data still was not retrieved, which
    usually means that some of the nodes chosen by coordinator are dead but were not detected
    as such just yet.
  * __on timed out write__, only if it occurred during writing to distributed batch log. It is very likely that
    coordinator picked unresponsive nodes that were not yet detected as dead.

Use `clojurewerkz.cassaforte.policies/retry-policy` to pick a policy by name:

``` clojure
(require '[clojurewerkz.cassaforte.policies :as cp])

(cp/retry-policy :default)
(cp/retry-policy :downgrading-consistency)
(cp/retry-policy :fallthrough)
```

Under some circumstances, it makes sense to tune the consistency level
for the subsequent write. This sacrifices consistency for
availability. Operation will still be considered as successful, even
though smaller amount of replicas were used for the operation.

For cases like that, you may use the downgrading policy. It will retry query:

  * __on timed out read__, if at least one replica responded, but consistency level was not met (amount
    of replicas that responded is smaller than requested consistency level). Read will be
    retried with lower consistency level.
  * __for unlogged batch queries__, it will retry with lower consistency level if at least one replica
    acknowledged the write. For other operations, timeout is ignored.
  * if coordinator node notices that there's __not enough replicas__ alive to satisfy query, execute
    same query with lower consistency level.

This policy should only be used when trade-off of writing data to the
smaller amount of nodes is acceptable. Also, that sometimes data won't
be even possible to read that way, because trade-off was made and
guarantees have changed. Reads with lower consistency level may
increase chance of reading stale data.

<div class="alert alert-error">
It is strongly recommended to wrap `DowngradingConsistencyPolicy` policy into `LoggingRetryPolicy`.
</div>

Fall through should be used if you want to take care of retries
yourself in business logic code.


## TLS Connections

Cassaforte supports TLS connections. To connect with TLS, you need to provide several
options as a map in the `:ssl` key:

 * `:keystore-path`
 * `:keystore-password`
 * `:cipher-suites`

``` clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as cc]))

(cc/connect ["127.0.0.1"] {:ssl {:keystore-path     "/path/to/jks/keystore"
                                 :keystore-password (System/getenv "KEYSTORE_PASSWORD")
                                 :cipher-suites     (into-array String ["TLS_RSA_WITH_AES_128_CBC_SHA" "TLS_RSA_WITH_AES_256_CBC_SHA"])}})
```

Or, if it is more convenient, provide an instance of `com.datastax.driver.core.SSLOptions`
via the `:ssl-options` key:

``` clojure
(ns cassaforte.docs.examples
  (:require [clojurewerkz.cassaforte.client :as cc]))

(cc/connect ["127.0.0.1"] {:ssl-options ssl-opts})
```
