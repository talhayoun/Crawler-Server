const form = document.getElementById("form");
const urlInput = document.getElementById("url");
const maxDepth = document.getElementById("maxDepth");
const maxTotalPages = document.getElementById("maxTotalPages");
const submitButton = document.getElementById("submitButton");
const loader = document.getElementById("loader");

// let webURL = "http://crawler-env.eba-igfs7zun.eu-west-1.elasticbeanstalk.com"
let webURL = "http://localhost:3000"

form.addEventListener("submit", (e)=>{
    submitButton.disabled = "true"
    submitButton.style.color = "red"
    loader.style.display = "block"
    e.preventDefault();
    const data = {
        url: urlInput.value,
        maxdepth: maxDepth.value,
        maxtotalpages: maxTotalPages.value
    }
    fetch(`${webURL}/start`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type" : "application/json"
        }
    })
    .then((res)=>{
        console.log(res)
        if(res.ok){
            return res.json();
        }
    })
    .then((jsonObj)=>{
        console.log(jsonObj.message)

        setTimeout(() => {
            location.href = `${webURL}?id=${jsonObj.message}`
        }, 1500);
    })
    .catch((err)=>{
        console.log(err);
    })
})

window.addEventListener("load", ()=>{
    let countMessage = 0;
    let countBeforeDisableInterval = 0;
    const dataDiv = document.getElementById("data");
    if(location.search.split("=")[0] == "?id"){
        loader.style.display = "block"
        submitButton.disabled = "true"
        submitButton.style.color = "red"
        let URLquery = location.search.split("=")[1];


            fetch(`${webURL}/fetch-data?id=${URLquery}`)
                .then((res)=>{
                    console.log(res);
                    if(res.ok){return res.json()};
                })
                .then((jsonObj)=>{
                    console.log(jsonObj)
                    let int =  setInterval(() => {
                        location.reload();
                    }, 5000);
                    if(jsonObj.data){
                        if(jsonObj.data.isComplete == true) { 
                            loader.style.animation = "none"
                            loader.style.borderTop = "none"
                            loader.style.border = "16px solid #52ff50"
                            loader.children[0].innerHTML = "Finished!"
                            clearInterval(int)
                        }
                        let root = jsonObj.data.root;
                        let createUL = document.createElement("ul");
                        let createLI = document.createElement("li");
                        createLI.innerHTML = root.title;
                        createLI.id = root.id;
                        createUL.appendChild(createLI)
                        dataDiv.appendChild(createUL)
                        createLI.addEventListener("click", fetchList)
                    }
                })
    }
})
const urlListDiv = document.getElementById("urllist");
const fetchList = function(e){
    console.log(e.target.id)
    if(e.target.hasChildNodes() && e.target.lastChild.nodeName !== "#text"){
        while(e.target.hasChildNodes()){
            if(e.target.lastChild.nodeName == "#text") break;;
            e.target.removeChild(e.target.lastChild)
        }
        return
    }
    let queueName = location.search.split("=")[1];
    let data = {id: e.target.id, queueName}
    fetch(`${webURL}/fetch-list`, {
        method: "POST",
        body: JSON.stringify(data),
        headers:{
            "Content-Type": "application/json"
        }
    })
    .then((res)=>{
        console.log(res, "Fetch list")
        if(res.ok){
            return res.json();
        }
    })
    .then((jsonObj)=>{
        console.log(jsonObj)
        let currentNode =  jsonObj.currentNode;
        for(let i = 0; i<currentNode.children.length; i++){
            let createUL = document.createElement("ul");
            let createLI = document.createElement("li");
            if(currentNode.children[i].title.length > 0){
                createLI.innerHTML = currentNode.children[i].title;
            }else{
                createLI.innerHTML = "View URL"
                // console.log(currentNode.children[i].url)
                createLI.setAttribute("title", currentNode.children[i].url)
                createLI.addEventListener("click", (e)=>{
                    if(e.target.innerHTML !== "View URL") return;
                    // console.log(e)
                    alert(e.target.title + "           - No links")
                })
            }
            createLI.addEventListener("click", (e)=>{
                if(currentNode.children[i].children.length == 0){
                    alert("No links")
                }
            })
            createLI.id = currentNode.children[i].id;
            createUL.appendChild(createLI)
            e.target.appendChild(createUL)
        }
    })
    .catch((err)=>{
        console.log(err)
    })
}
