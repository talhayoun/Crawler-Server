const redisClient = require("../db/redis");

class Node {
    constructor(url, depth, id) {
        this.title = '';
        this.url = url;
        this.depth = depth;
        this.children = [];
        this.id = id;
    }
}

class Tree {
    constructor(node, maxTotalPages, maxDepth) {
        this.maxTotalPages = maxTotalPages
        this.maxDepth = maxDepth
        this.root = node;
        this.currentDepth = 0;
        this.currentPage = 0;
        this.isComplete = false;
    }
}

let insertChildrenToNode = async function (links, node, id) {
    console.log(node, "node")
    for (let i = 0; i < links.length; i++) {
        node.children.push(new Node(links[i], parseInt(node.depth) + 1, `${id}/${i}`))
    }
}

let insertTreeToRedis = async function (tree, queueName) {
    console.log("------------- INSERTING TREE TO REDIS -------------------")
    let stringfyTree = JSON.stringify(tree)
    await redisClient.setexAsync(queueName, 1800, stringfyTree)
}

const redisGetNodeNTree = async function (queueName) {
    let tree = await redisClient.getAsync(queueName);
    let parsed = JSON.parse(tree);
    return parsed;
}

const addNodeToTree = async function (queueName, node) {
    console.log("-----------------Add node to tree ---------------------------")
    const Tree = await redisGetNodeNTree(queueName);
    const root = updateTree(node.id, node, Tree.root);
    await insertTreeToRedis(Tree, queueName);
}

const updateTree = async function (id, node, root) {
    let idArray = id.split("/");
    let currentNode = root;
    for (let i = 1; i < idArray.length; i++) {

        if (i == idArray.length - 1) currentNode.children[idArray[i]] = node;
        currentNode = currentNode.children[idArray[i]];
    }
    console.log(root, "-------------------------------------------------------------------------------")
    return root;
}


const updateTreePages = async function (queueName, currentDepth) {
    let tree = await redisGetNodeNTree(queueName);
    console.log(tree, "UPDATING TREE PLUS ONE PAGE");
    tree.currentPage++;
    tree.currentDepth = tree.currentDepth > currentDepth ? tree.currentDepth : currentDepth
    await insertTreeToRedis(tree, queueName)
}

const createNode = async function (url, id, currentDepth, links, pageTitle, node) {
    let newNode = node;
    if (!node) {
        console.log("------------------------ CREATING NEW NODE ---------------------------------")
        newNode = new Node(url, currentDepth, id);
        await insertChildrenToNode(links, newNode, id);
        newNode.title = pageTitle;
    } else {
        console.log("------------------------ NODE ALREADY EXISTS ---------------------------------")
        newNode.currentDepth = currentDepth
        newNode.id = id;
        for (let i = 0; i < newNode.children; i++) {
            newNode.children[i].id = `${id}/${i}`;
        }
    }
    await insertNodeToRedis(newNode);
    return newNode;
}


let createRoot = async function (messageURL, maxTotalPages, maxDepth, id, queueName, links, pageTitle, node) {
    let newNode = node;
    if (!node) {
        newNode = await createNode(messageURL, id, 0, links, pageTitle);
    }
    let newTree = new Tree(newNode, maxTotalPages, maxDepth)
    console.log(newTree, "CREATED NEW TREE -----------------------------------------")
    await insertTreeToRedis(newTree, queueName);
}

let insertNodeToRedis = async function (node) {
    console.log("--------------------INSERTING NODE TO REDIS ----!!!!1", node)
    let newNode = new Node(node.url, node.depth, node.id);
    newNode.children = node.children
    console.log(node.children, " node children")
    console.log(newNode.children, " new node children")
    console.log(newNode.children.length, "children length")
    newNode.title = node.title
    for (let i = 0; i < newNode.children.length; i++) {
        delete newNode.children[i].id
        delete newNode.children[i].depth
    }
    delete newNode.depth;
    delete newNode.id;
    let JSONobj = JSON.stringify(newNode);
    await redisClient.setexAsync(newNode.url, 1800, JSONobj);
}

const checkMaxDepthAndMaxPages = async function (queueName, currentDepth) {
    let tree = await redisGetNodeNTree(queueName);
    let currentVisitedPages = tree.currentPage

    console.log(`CurrentDepth : ${currentDepth}  MaxDepth: ${tree.maxDepth}`)
    console.log(`CurrentPages : ${currentVisitedPages}  MaxPages: ${tree.maxTotalPages}`)
    if (currentDepth >= tree.maxDepth || currentVisitedPages >= tree.maxTotalPages) {
        console.log("true")
        tree.isComplete = true;
        await insertTreeToRedis(tree, queueName);
        return true
    }
    return false
}

const isNodeInDB = async function (URL) {
    let node = await redisGetNodeNTree(URL)
    if (node) {
        return node;
    }
    return false;
}

module.exports = { Tree, Node, createRoot, createNode, addNodeToTree, updateTreePages, checkMaxDepthAndMaxPages, isNodeInDB };