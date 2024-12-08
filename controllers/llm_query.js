const { GEMINI_API_KEY } = require("../api_keys");
const db = require("../config/knex");
const axios = require('axios');
const soundex = require('soundex');

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

async function geminiOutput(naturalQuery) {
    const chatSession = model.startChat({
        generationConfig,
        history: [
            {
                role: "user",
                parts: [
                    {
                        text: `
  I have provided database schemas for three systems: ResearchSystem1, ResearchSystem2, and Patents. Your task is to convert natural language queries into optimized SQL queries. Below are the schemas:
  
  ### ResearchSystem1
  \\\`sql
  CREATE DATABASE IF NOT EXISTS ResearchSystem1;
  USE ResearchSystem1;
  
  CREATE TABLE Papers (
      id BIGINT PRIMARY KEY,
      title VARCHAR(600) NOT NULL,
      year INT,
      n_citation INT,
      doc_type VARCHAR(15),
      publisher VARCHAR(350),
      volume VARCHAR(20),
      issue VARCHAR(20),
      doi VARCHAR(160)
  );
  
  CREATE TABLE Authors (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      org VARCHAR(255)
  );
  
  CREATE TABLE Paper_Authors (
      paper_id BIGINT,
      author_id BIGINT,
      PRIMARY KEY (paper_id, author_id),
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES Authors(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Paper_References (
      paper_id BIGINT,
      reference_id BIGINT,
      valid BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Fields_of_Study (
      paper_id BIGINT,
      topic VARCHAR(255),
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Venue (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      raw VARCHAR(350),
      type VARCHAR(50)
  );
  
  CREATE TABLE Papers_Venue (
      paper_id BIGINT PRIMARY KEY,
      venue_id BIGINT,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
      FOREIGN KEY (venue_id) REFERENCES Venue(id) ON DELETE CASCADE
  );
  \\\`
  
  ### ResearchSystem2
  \\\`sql
  CREATE TABLE Papers (
      id BIGINT PRIMARY KEY,
      title VARCHAR(600) NOT NULL
  );
  
  CREATE TABLE Papers_Metadata (
      paper_id BIGINT PRIMARY KEY,
      year INT,
      n_citation INT,
      doc_type VARCHAR(15),
      publisher VARCHAR(350),
      volume VARCHAR(20),
      issue VARCHAR(20) NULL,
      doi VARCHAR(160) NULL,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Authors (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      org VARCHAR(255) NULL
  );
  
  CREATE TABLE Paper_Authors (
      paper_id BIGINT,
      author_id BIGINT,
      PRIMARY KEY (paper_id, author_id),
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES Authors(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Paper_References (
      paper_id BIGINT,
      reference_id BIGINT,
      valid BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Fields_of_Study (
      paper_id BIGINT,
      topic VARCHAR(255),
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE
  );
  
  CREATE TABLE Venue (
      id BIGINT PRIMARY KEY,
      raw VARCHAR(350),
      type VARCHAR(50)
  );
  
  CREATE TABLE Papers_Venue (
      paper_id BIGINT PRIMARY KEY,
      venue_id BIGINT,
      FOREIGN KEY (paper_id) REFERENCES Papers(id) ON DELETE CASCADE,
      FOREIGN KEY (venue_id) REFERENCES Venue(id) ON DELETE CASCADE
  );
  \\\`
  
  ### Patents
  \\\`sql
  CREATE DATABASE patents_db;
  USE patents_db;
  
  CREATE TABLE patents (
      patent_id VARCHAR(255) PRIMARY KEY,
      patent_date VARCHAR(255) NOT NULL,
      patent_year YEAR NOT NULL,
      patent_title TEXT NOT NULL,
      patent_abstract TEXT,
      author_id BIGINT NOT NULL,
      assignee_id VARCHAR(100) NOT NULL
  );
  
  CREATE TABLE assignees (
      assignee_id VARCHAR(100) PRIMARY KEY,
      assignee_organization VARCHAR(500) NOT NULL,
      assignee_country VARCHAR(100) NOT NULL
  );
  
  CREATE TABLE authors (
      author_id BIGINT PRIMARY KEY,
      author_name VARCHAR(255) NOT NULL,
      author_country VARCHAR(200) NOT NULL
  );
  \\\`
  
  Your task is to generate optimized SQL queries from natural language requests based on the above schemas. Ensure the queries:
  - Use indexed columns for filtering.
  - Minimize use of unindexed functions like \SOUNDEX\ directly on large datasets.
  - Include proper joins, grouping, and aggregation.
  - Use subqueries or CTEs to filter data early.
  
  Reply "Ready" when you understand and are ready to generate optimized queries.
              `,
                    },
                ],
            },
            {
                role: "model",
                parts: [{ text: "Ready" }],
            },
            {
                role: "user",
                parts: [
                    {
                        text: `
  Please write optimized SQL queries for the following request:
  
  "Retrieve all patents and papers authored by Nayan Dwivedi. 
  Use Soundex queries for author names. 
  For ResearchSystem databases, provide: doi, title, author, venue, citations, year, and field of study. 
  For Patents database, provide: patentID, patent title, patent year, author name, and patent abstract."
  
  Ensure the queries are efficient and include joining logic with indexed columns. Provide the response in JSON format with keys:
  {
    "researchSystem1": "optimized SQL query for researchSystem1",
    "researchSystem2": "optimized SQL query for researchSystem2",
    "patent": "optimized SQL query for patent",
    "paperJoin": "sample column name for joining researchSystem1 and researchSystem2",
    "patentJoin": "sample column name for joining patents and researchSystem(combined)"
  }
            `,
                    },
                ],
            },
        ],
    });

    const message = naturalQuery.concat("For ResearchSystem databases, provide with these labels: id, title, authors, venue, citations, year, and fields. For Patents database, provide with these labels: id, title, author_name, year and patent_abstract. Please use LIKE matching. paperJoin should have the column to join researchSystem1 and researchSystem2, patentJoin should have the column to join patent with the combined researchSystem. If the query mentions only one type of item, like research papers or patents then the query should get data only from those databases, not the other ones, and accordingly set paperJoin and patentJoin. Answer strictly in json.");

    try {
        const result = await chatSession.sendMessage(message);
        return result;
    } catch (error) {
        return -1;
    }
}

module.exports.handleQuery = async function (req, res) {
    const naturalQuery = req.body.llm_query;
    let llmOutput;
    for (let i = 0; i < 3; i++) {
        llmOutput = await geminiOutput(naturalQuery);
        if (llmOutput !== -1) break;
    }
    if (llmOutput === -1) {
        return res.status(500).json({ message: "Error in generating SQL query" });
    }
    const sqlQuery = llmOutput.response.text().replace(/```json|```/g, '').trim();

    // console.log(llmOutput.response.text());

    // Parse the JSON string
    const queryObject = JSON.parse(sqlQuery);

    // Extract the required properties
    const researchSystem1Query = queryObject["researchSystem1"];
    const researchSystem2Query = queryObject["researchSystem2"];
    const patentQuery = queryObject["patent"];
    const paperJoin = queryObject["paperJoin"];
    const patentJoin = queryObject["patentJoin"];

    // Execute the queries
    let researchSystem1Results = (researchSystem1Query === null || researchSystem1Query === undefined) ? [] : await axios.get(`http://13.60.225.50:5000/execute_query?query=${encodeURIComponent(researchSystem1Query)}`);
    researchSystem1Results = researchSystem1Results.data.results ? researchSystem1Results.data.results : [];
    const researchSystem2Results = (researchSystem2Query === null || researchSystem2Query === undefined) ? [] : (await db.raw(researchSystem2Query))[0];
    let patentResults = patentQuery === null || patentQuery === undefined ? [] : await axios.get(`http://13.60.232.202:5000/query?sql=${encodeURIComponent(patentQuery)}`);
    patentResults = patentResults.data.data ? patentResults.data.data : [];

    let researchResults = [...(researchSystem1Results ?? []), ...(researchSystem2Results ?? [])];

    let papers = researchResults;
    let patents = patentResults;

    if (patentJoin) { // apply soundex to keep results having similar author names
        papers = papers.filter((paper) => {
            // split the author names into an array
            const authorNames = paper.authors.split(", ");

            // check if any of the author names is similar to any of the patent author names
            return authorNames.some((authorName) => patents.some((patent) => soundex(authorName) === soundex(patent.author_name)));
        });

        patents = patents.filter((patent) => {
            const authorName = patent.author_name;
            return papers.some((paper) => {
                const authorNames = paper.authors.split(", ");
                return authorNames.some((authorName) => soundex(authorName) === soundex(authorName));
            });
        });
    }

    return res.render("llm_results", {
        title: "PaperTrail",
        papers,
        patents
    });
}