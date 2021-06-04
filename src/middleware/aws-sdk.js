const AWS = require("aws-sdk");

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' })

const createNewQueue = async function () {
    try {
        let time = new Date().getTime();
        let name = `${time}`
        let newSQS = await sqs.createQueue({
            QueueName: `${name}.fifo`,
            Attributes: {
                FifoQueue: "true",
                ContentBasedDeduplication: "true",
                ReceiveMessageWaitTimeSeconds: "20",
                VisibilityTimeout: "120"
            },
        }).promise();
        return newSQS.QueueUrl;
    } catch (err) {
        console.log(err)
    }
}

const getQueueAttributes = async function (URL) {
    try {
        let { data } = await sqs.getQueueAttributes({
            QueueUrl: URL,
            AttributeNames: [
                "ApproximateNumberOfMessages",
                "ApproximateNumberOfMessagesNotVisible",
                "ApproximateNumberOfMessagesDelayed"
            ]
        }).promise();
        let numOfMessage = parseInt(data.ApproximateNumberOfMessages)
        let numOfMessagesNotVisible = parseInt(data.ApproximateNumberOfMessagesNotVisible)
        let numOfMessagesDelayed = parseInt(data.ApproximateNumberOfMessagesDelayed)
        return { numOfMessage, numOfMessagesNotVisible, numOfMessagesDelayed };
    } catch (err) {
        console.log(err, "failed to receive")
    }
}

const createMessageToQueue = async function (queueURL, startURL, maxDepth, totalPages) {
    try {

        await sqs.sendMessage({
            QueueUrl: queueURL,
            MessageAttributes: {
                "maxdepth": {
                    DataType: "String",
                    StringValue: maxDepth
                },
                "maxtotalpage": {
                    DataType: "String",
                    StringValue: totalPages
                },
                "id": {
                    DataType: "String",
                    StringValue: "0"
                }
            },
            MessageBody: startURL,
            // MessageDeduplicationId: id,
            MessageGroupId: "MyGroup",
        }).promise();
        console.log("SENT MESSAGE ----")
    } catch (err) {
        console.log(err, "            message")
    }
}

module.exports = { createMessageToQueue, createNewQueue, getQueueAttributes }