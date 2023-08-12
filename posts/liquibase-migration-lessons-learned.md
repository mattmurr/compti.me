---
title: "Navigating the mess of a Liquibase Migration: Lessons Learned from a Production Incident"
date: 2023-08-05
---

In the dynamic world of software development, managing database changes efficiently is paramount to the stability and success of any dependant project. Recognising this, our team embarked on a journey to reintroduce Liquibase, a powerful tool for versioning database schemas and automating migrations. Little did we know that this decision would lead us to a nail-biting production incident, revealing valuable insights and prompting us to strengthen our processes.

Before delving into the incident, let's rewind to the origin of the challenge. Our PostgreSQL database had initially been created using Liquibase, but somehow, it fell by the wayside, and the team resorted to applying database changes manually—a tech debt that loomed over us. Determined to regain control and ensure a repeatable process for our database, a few members of the team gave considerable effort to reconstructing the Liquibase project, eager to have it back in action.

As fate would have it, the night we finally released our Liquibase migration epic turned out to be anything but ordinary. Just as I was unwinding during my annual leave, a Slack message from a colleague roused me from my relaxation. They sought my assistance in overseeing the deployment of the Liquibase project into production.

I opened up my work machine with a sense of duty to my team. It goes as smooth as any other ordinary release. Satisfied, I amend my timesheet and get back to my leave.

However, the following night would post a challenge in unforeseen ways. An unrelated hotfix failed to deploy, and the culprit turned out to be the Kubernetes pod responsible for running the Liquibase project. It had unexpectedly hung while attempting to access the database, disrupting the synchronous deployment pipeline and causing a critical incident to loom overhead.

After some time, it became apparent that the root cause lay in shared access locks within the database. The initial thought was that there was a rogue lock that we could just remove, and used [this query from a StackOverflow answer](https://stackoverflow.com/a/43363536) to find the cause of the lock to find where it'd come from:

```sql
select pid, 
       usename, 
       pg_blocking_pids(pid) as blocked_by, 
       query as blocked_query
from pg_stat_activity
where cardinality(pg_blocking_pids(pid)) > 0;
```

This highlighted multiple processes running the same query. Digging deeper, it was discovered that these processes were being triggered from somewhere (not yet known where exactly), and gathering in number over time. Metrics showed that the database CPU usage grew to 100% over a few hours, and the Liquibase pod was waiting for the locks to clear.

The query in question, was in the Liquibase project and it was determined that its job wasn't essential, and it should be safe to kill those processes, so this query was used:

```sql
select pg_cancel_backend(pid) from pg_stat_activity
where state = 'active' and query = 'The query';
```

Relief filled the air, it worked, and the database CPU usage dropped back down. A redeployment was triggered, which stalled due to the same issue, but running the above again got us through the deployment. I mentioned earlier that it wasn't clear where the processes were being triggered from, and so my colleague, who was working the next day, would have to run the query throughout the day, to keep the database CPU usage down.

![Reset Button GIF by MOODMAN](https://media3.giphy.com/media/LMQ9c65BnD2gzMiJWg/giphy.gif?cid=ecf05e47vhnsgygrs8o7hfnk0bi4118hily37p9d4ooebjay&ep=v1_gifs_search&rid=giphy.gif&ct=g)

## The following days

When I returned to work, my team had found the Lambda function which was triggering the procedure, it had been disabled so that he could stop resetting. Looking into the metrics for that function, the Lambda function had been timing out, leaving the database process running. From an average runtime of 10 seconds, to exceeding the 60-second timeout configured for the Lambda. We tried the query manually... we had to abort the process after 3 hours, no telling how much longer it would take.

Going through the query in sections, a performance issue was found in a section of the procedure. It goes through an array of primary key indexes, comparing various columns. These rows exist on a remote table. I ran the `ANALYZE table_name`, and to my surprise, the procedure's performance was back to normal. After reading the documentation for `postgres_fdw`, I suspect that the database engine couldn't make an optimal query for the remote table as it did not hold any statistics about the table, locally. `ANALYZE` scans the remote table and makes those local statistics available. But **how does that improve query performance?** Some reading indicates that statistics include details about “live” and “dead” rows. This somewhat relates to vacuuming:

> `VACUUM` reclaims storage occupied by dead tuples. In normal PostgreSQL operation, tuples that are deleted or obsoleted by an update are not physically removed from their table; they remain present until a `VACUUM` is done. Therefore it's necessary to do `VACUUM` periodically, especially on frequently-updated tables.
> 
> [https://www.postgresql.org/docs/current/sql-vacuum.html](https://www.postgresql.org/docs/current/sql-vacuum.html)

Essentially `VACUUM` is garbage collection. So, if that table has not been vacuumed nor analysed, then performance would have been hit when we come across dead rows in the foreign table.

## What could have been done better?

I hate the fact that this problem only cropped up during another release, and could have gone for weeks without detection. Racking up the costs of the database CPU usage and long running Lambda invocations.

* There were no alerts for the database CPU usage, excessive database locks or even that the Lambda function was timing out. We could have found this a day before.
* Maybe the Lambda function could have cleaned up the process it started after timing out? I'm thinking that we could log out the pid and use EventBridge to trigger another Lambda when a timeout occurs, stopping that process.
* Optimising the queries on the remote table as a part of Liquibase releases.
* A plan to seamlessly roll back the database schema without losing data.
* Whoever before me, shouldn't have created the problem of manually managing the database, instead of continuing to use Liquibase. Follow through and make a proper solution.

## Closing words

Throughout the course of this hell, I learned a bit about the inner workings of PostgreSQL, helped to prevent a critical incident and had my well-deserved time off disturbed. But, it was _fun_ and gave me a small story to tell in this article.
