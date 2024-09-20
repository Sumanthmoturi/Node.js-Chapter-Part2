/*12.Streams:-
                1.Streams in Node.js provide an efficient way to handle data that is too large to be processed all at once or needs to be processed as it arrives,such as data from HTTP requests or reading large files.
                2.Streams are of two types:-
                                            1.Writable streams:You can write data to these streams.
                                            2.Readable stream:You can read data from these streams.
*/
/*Writable Streams:-
                1. writable stream allows you to send data in chunks.
                2.For example, when an HTTP server sends data to the client, it uses a writable stream (response object).
                3.Key Methods:
                            1.write(chunk, [encoding], [callback])                         
                            2.end([chunk], [encoding], [callback]) 
                4.Example:-
*/
import { createWriteStream } from "node:fs";
let stream = createWriteStream("output.txt");
stream.write("This is the first line.\n");
stream.write("This is the second line.\n");
stream.end("This is the last line.");
/*Readable Stream:-
                   1.A readable stream allows you to read data in chunks
                   2.The request object in an HTTP server is an example of a readable stream, allowing the server to read data sent by the client.
                   3.It has 2 events:-
                                      1."data" event:-Fired whenever a new chunk of data is available to read.
                                      2."end" event:-Fired when all data has been read and no more chunks are available.
                   4.To attach event listeners to a readable stream, you use the "on" method,
*/
import { createServer } from "node:http";
createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  request.on("data", chunk => {
    response.write(chunk.toString().toUpperCase());
  });
  request.on("end", () => response.end());
  
}).listen(8000);



/*13.Making requests on server:- 
                              Once the server is running, you can send a POST request to it using the fetch function
*/
fetch("http://localhost:8000/", {
    method: "POST",
    body: "Hello server"
  }).then(resp => resp.text()).then(console.log);
  //output will be  HELLO SERVER
  


/*14.File Server:-
                   1. an HTTP server that allows remote access to a filesystem. 
                   2.HTTP file server in Node.js, which lets you interact with files on a server using HTTP methods like GET, PUT, and DELETE. 
            
*/
//Building a basic http file server in node.js
import {createServer} from "node:http";                  //Import the HTTP module to create a server
const methods = Object.create(null);                     //Create an object to store methods (GET, PUT, DELETE, etc.) for handling requests
//1.Create the HTTP server
createServer((request, response) => {
  let handler = methods[request.method] || notAllowed;   // Determine the handler function for the incoming request method,If the method is not supported, use `notAllowed` as the handler
  handler(request).catch(error => {                      // Call the handler function and catch any errors during execution
    if (error.status != null) return error;              // If the error has a `status`, return the error as it is (custom error)
    return {body: String(error), status: 500};           // If it's a general error, convert it into a response with a 500 (internal server error) status 
  }).then(({body, status = 200, type = "text/plain"}) => {
    response.writeHead(status, {"Content-Type": type});  // Set the response headers (status and content type)
    if (body?.pipe) body.pipe(response);                 // If the body is a readable stream,pipe it to the response
    else response.end(body);                             // Otherwise, end the response and send the body as a string or buffer
  });
}).listen(8000);                                         // Start the server on port 8000

async function notAllowed(request) {                     // This function handles unsupported methods and returns a 405 (method not allowed) status
  return {
    status: 405,
    body: `Method ${request.method} not allowed.`
  };
}

//2.Handling filpaths:Import functions to resolve paths and get the system's path
import {resolve, sep} from "node:path";
const baseDirectory = process.cwd();                     // Get the current base working directory 
function urlPath(url) {                                  // Function to resolve the file path from the request URL
  let {pathname} = new URL(url, "http://d");             // Parse the URL to get the pathname
  let path = resolve(decodeURIComponent(pathname).slice(1));   // Decode the pathname and resolve it to an absolute path relative to the base directory
  if (path != baseDirectory &&                                 // Ensure the resolved path is within the server's base directory 
      !path.startsWith(baseDirectory + sep)) {
    throw {status: 403, body: "Forbidden"};                    // Throw an error if access is outside allowed directories
  }
  return path;                                                 // Return the valid file path
}

//3.GET method:- Import necessary file system functions to read and get file stats
import {createReadStream} from "node:fs";
import {stat, readdir} from "node:fs/promises";
import {lookup} from "mime-types";                            // For identifying file types (MIME types)
methods.GET = async function(request) {
    let path = urlPath(request.url);                          // Get the path from the request URL
    let stats;
    try {
      stats = await stat(path);                               // Get stats for the file
    } catch (error) {                                         // If the file doesn't exist, return a 404 (file not found) error
      if (error.code != "ENOENT") throw error;
      else return {status: 404, body: "File not found"};
    }                                                         // If the path is a directory, return a list of files
    if (stats.isDirectory()) {
      return {body: (await readdir(path)).join("\n")};
    } else {
      return {body: createReadStream(path),                   // If it's a file, return its content using a readable stream and identify its type
              type: lookup(path)};
    }
  };


//4.DELETE method:-Import functions to delete directories and files
import {rmdir, unlink} from "node:fs/promises";
methods.DELETE = async function(request) {                     // Define the DELETE method to handle file and directory deletion
  let path = urlPath(request.url);                             // Get the path from the request URL
  let stats;
  try {
    stats = await stat(path);                                  // Check if the file or directory exists
  } catch (error) {
                                                               // If the file doesn't exist, return 204 since the file is already "deleted"
    if (error.code != "ENOENT") throw error;
    else return {status: 204};
  }
  if (stats.isDirectory()) await rmdir(path);                  // If it's a directory, delete it, otherwise delete the file
  else await unlink(path);

  return {status: 204};                                        // Return 204 to indicate successful deletion
};

//5.PUT method:- Import function to write streams to files
import {createWriteStream} from "node:fs";
function pipeStream(from, to) {                                // Helper function to pipe data from one stream to another, returning a promise
  return new Promise((resolve, reject) => {
    from.on("error", reject);                                  // Handle errors in the readable stream
    to.on("error", reject);                                    // Handle errors in the writable stream
    to.on("finish", resolve);                                  // Resolve the promise when writing is finished
    from.pipe(to);                                             // Pipe the data from `from` stream to `to` stream
  });
}
methods.PUT = async function(request) {                        // Define the PUT method to handle file creation or overwriting
  let path = urlPath(request.url);                             // Get the path from the request URL
                                                               // Pipe the incoming request data to the specified file path
  await pipeStream(request, createWriteStream(path));
  return {status: 204};                                        // Return 204 to indicate the file was successfully written
};

//6.MKCOL method:-Import function to create directories
import {mkdir} from "node:fs/promises";
methods.MKCOL = async function(request) {                      // Define the MKCOL method to handle directory creation
  let path = urlPath(request.url);                             // Get the path from the request URL
  let stats;
  try {
    stats = await stat(path);                                  // Check if the path already exists
  } catch (error) {
    if (error.code != "ENOENT") throw error;                   // If the directory doesn't exist, create it
    await mkdir(path);                                        
    return {status: 204};                                      // Return 204 to indicate the directory was created
  }
  if (stats.isDirectory()) return {status: 204};               // If the path is already a directory, return 204
  else return {status: 400, body: "Not a directory"};          // If it's not a directory, return 400
};



/*15.MIME types:- Server uses mime types package to correct content type for files based on extensions (eg:-.txt files are text/plain,.png files are image/png)  */


/*16.Testing file server:- To test file server you can use CURL COMMAND*/


