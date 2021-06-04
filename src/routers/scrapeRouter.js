const express = require("express");
const router = new express.Router();
const redisClient = require("../db/redis");
const { createMessageToQueue, createNewQueue, getQueueAttributes } = require("../middleware/aws-sdk");
const axios = require("axios");
const { createRoot, createNode, addNodeToTree, updateTreePages, checkMaxDepthAndMaxPages, isNodeInDB, updateTreeNumOfNodes, decreamentNumOfNodes, getNumOfNodes, pendingDepthIncrease } = require("../utils/tree");

router.post("/start", async (req, res) => {
    try {
        let userURL = req.body.url;
        if (!userURL.endsWith("/")) {
            userURL = userURL + "/"
        }
        let queueName = `${userURL}_${req.body.maxtotalpages}_${req.body.maxdepth}`
        let isAlreadyInDB = await redisClient.getAsync(queueName)
        if (isAlreadyInDB) {
            res.send({ message: queueName })
        } else {
            let QueueURL = await createNewQueue()
            await createMessageToQueue(QueueURL, userURL, req.body.maxdepth, req.body.maxtotalpages);
            let workerURL = "http://localhost:4000/"
            axios.post(workerURL, { QueueURL })
            res.send({ message: queueName })
        }
    } catch (err) {
        res.status(404).send("Failed to start");
    }
})

router.get("/fetch-data", async (req, res) => {
    try {
        console.log("fetch dataaa")
        let visitedPages = await redisClient.getAsync(req.query.id)
        if (visitedPages) {
            let parsed = JSON.parse(visitedPages)
            res.send({ data: parsed })
        } else {
            res.send({ message: "None" });
        }
    } catch (err) {

    }
})

router.post("/fetch-list", async (req, res) => {
    try {
        let queueName = req.body.queueName;
        let id = req.body.id

        console.log(id, "id")
        let getList = await redisClient.getAsync(queueName);
        let parsedData = JSON.parse(getList)
        let currentNode = parsedData.root;
        let idArrays = [];
        if (id.length !== 1) {
            idArrays = id.split("/");
        }
        console.log(idArrays)
        console.log(currentNode)
        for (let i = 1; i < idArrays.length; i++) {
            if (currentNode.id == id) break;
            currentNode = currentNode.children[idArrays[i]];
            console.log(currentNode, "current")
        }
        res.send({ currentNode })
    } catch (err) {
        console.log(err);
        res.status(404).send("Failed to fetch list")
    }
})

router.post("/get-data", async (req, res) => {
    console.log(req.body)
    let pageTitle = req.body.data.pageTitle;
    let links = req.body.data.links;
    let id = req.body.data.id;
    let queueName = req.body.data.queueName;
    let maxDepth = req.body.data.maxDepth;
    let maxTotalPages = req.body.data.maxTotalPages;
    let messageURL = req.body.data.messageURL;
    let currentDepth = req.body.data.currentDepth
    let queueURL = req.body.QueueURL;

    let node = await isNodeInDB(messageURL);
    console.log(node, "nodddddd")

    if (id == 0) {
        let newRoot = await createRoot(messageURL, maxTotalPages, maxDepth, id, queueName, links, pageTitle, node);
        let { data } = await getQueueAttributes(queueURL);
        let numOfMessage = parseInt(data.numOfMessage);
        let numOfMessagesNotVisible = parseInt(data.numOfMessagesNotVisible);
        let numOfMessagesDelayed = parseInt(data.numOfMessagesDelayed);

        await updateTreeNumOfNodes(numOfMessage + numOfMessagesDelayed + numOfMessagesNotVisible, queueName);

    } else {
        let isReachedDepthOrPages = await checkMaxDepthAndMaxPages(queueName, currentDepth || 0);
        if (isReachedDepthOrPages) {
            console.log("REACHED MAXDEPTH")
            return;
        }
        let newNode = await createNode(messageURL, id, currentDepth, links, pageTitle, node);
        console.log("-------------------- Adding node to TREE ------------")
        console.log(newNode)
        console.log("!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@!@")
        await addNodeToTree(queueName, newNode);
        await decreamentNumOfNodes(queueName);
    }
    await updateTreePages(queueName, currentDepth || 0)
})

module.exports = router;