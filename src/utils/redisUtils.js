const redisGetTree = async function (queueName) {
    let tree = await redisClient.getAsync(queueName);
    let parsed = JSON.parse(tree);
    return parsed;
}