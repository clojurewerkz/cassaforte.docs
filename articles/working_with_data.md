
## Prepared statements

Rougly, prepared statements in Cassaforte are evaluated the following way:

  * Query DSL generates a query, replacing all the values with `?` signs. For example

```clojure
(cql/insert :posts
            (values {:userid "user1"
                     :posted_at "2012-01-01"
                     :entry_title "Catcher in the rye"
                     :content "Here goes content"}))
```

Would generate:

```clojure
["INSERT INTO posts (userid, posted_at, entry_title, content) VALUES(?, ?, ?, ?);"
 ["user1" "2012-01-01" "Catcher in the rye" "Here goes content"]]
```

  * Cassaforte checks if query is already in local query cache. If it is, it returns
prepared statement ID for the next step. Otherwise, query is sent to to Cassandra for
processing, when Statement ID is returned, it's cached.

  * Query ID is passed to the server along with values for the query.


We find prepared statements to be very useful. Most of time
