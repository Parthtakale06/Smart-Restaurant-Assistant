import express from "express";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai"
import { createAgent, tool } from "langchain";
import { DynamicStructuredTool } from "langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from "dotenv";
import {z} from "zod";
import path from "path";

dotenv.config();

const port = 5000;

const app = express();
app.use(express.json());

const __dirname = path.resolve();


//Create gemini model 
const model = new ChatGoogleGenerativeAI({
    model : "gemini-2.5-flash",
    maxOutputTokens : 2048,
    temperature : 0.7,
    apiKey : process.env.GEMINI_API_KEY
});

//Create Dynamic Tool
const getMenuTool = new DynamicStructuredTool({
    name : "getMenu",
    description : "Return the final answer for todays menu for the given category (breakfast , lunch or dinner). Use this tool directly answer the users menu question",
    schema : z.object({
        category : z.string().describe("Type of food. Example breakfast, lunch, dinner")
    }),
    func : async({category}) =>{
        const menus ={
            breakfast : "Aloo Paratha , Poha , Chai",
            lunch : "Dal Rice, Chapati Sabji",
            dinner : "Ver Pulav, Biryani , Chole Rice"
        }
        return menus[category.toLowerCase()] || "No menu found for the following Category";
    }
    

});

const prompt = ChatPromptTemplate.fromMessages([
 ["system" , "You are smart restaurant assistant"],
 ["human" , "{input}"],
 ["ai" , "{agent_scratchpad}"]
]);


const agent = await createAgent({
    model : model,
    tools : [getMenuTool],
    prompt : prompt
});

const res = await agent.invoke({
   messages :  [ { role : "user", content: "What is the food available for the dinner"}]
});

console.log(res.messages[res.messages.length - 1].content);

app.get('/' , (req, res)=> {
    return res.sendFile(path.join(__dirname , 'public' , 'index.html'));
})

app.post("/api/query" , async (req, res)=>{
    try{
        const query = req.body.query;

        const result = await agent.invoke({
        messages :  [ { role : "user", content: query}]
    });

    const finalResponse = result.messages[result.messages.length - 1].content;

    res.json({ answer: finalResponse });

    }catch(err){
        console.log("Error while fetching details from agent")
    }
})

app.listen(port , ()=>{
    console.log(`server listning at port ${port}`);
})