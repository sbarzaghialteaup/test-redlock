const Redis = require("ioredis");
const Redlock = require("redlock");

class Locker {
    constructor() {
        this.client = Redis.createClient();

        this.redlock = new Redlock(
            // you should have one client for each independent redis node
            // or cluster
            [this.client],
            {
                // the expected clock drift; for more details
                // see http://redis.io/topics/distlock
                driftFactor: 0.01, // multiplied by lock ttl to determine drift time

                // the max number of times Redlock will attempt
                // to lock a resource before erroring
                retryCount: 1000,

                // the time in ms between attempts
                retryDelay: 250, // time in ms

                // the max time in ms randomly added to retries
                // to improve performance under high contention
                // see https://www.awsarchitectureblog.com/2015/03/backoff.html
                retryJitter: 200, // time in ms
            }
        );
    }

    lock(resource) {
        // the maximum amount of time you want the resource locked in milliseconds,
        // keeping in mind that you can extend the lock up until
        // the point when it expires
        const ttl = 24 * 60 * 60 * 1000;
        return this.redlock.lock(resource, ttl);
    }

    // eslint-disable-next-line class-methods-use-this
    unlock(resourceLock) {
        return resourceLock.unlock();
    }

    // eslint-disable-next-line class-methods-use-this
    extendLock(resourceLock) {
        resourceLock.extend(6000);
    }
}

async function main() {
    const locker = new Locker();

    const lockAll = [];

    for (let index = 0; index < 10000; index++) {
        console.log(new Date(), "locking request", index);
        lockAll.push(
            locker.lock(`LOCK-KEY`).then((lock) => {
                console.log(new Date(), "locked", index);
                lock.unlock();
            })
        );
    }

    try {
        await Promise.all(lockAll);
    } catch (error) {
        console.error(error);
    }

    // await locker.redlock.quit();
}

main();
