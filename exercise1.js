//Exercise1=Search Tool

import { statSync, readdirSync, readFileSync } from "node:fs";
let searchTerm = new RegExp(process.argv[2]);                    // Get the search term from the first command-line argument and create a RegExp object.
for (let arg of process.argv.slice(3)) {
  search(arg);                                                   // Call the search function on each file or directory
}
function search(file) {                                          // Function to search inside files or directories..
  let stats = statSync(file);                                    // Get information about the file (is it a directory or a file?) using statSync
  if (stats.isDirectory()) {                                     // If it's a directory, read its contents and search each file/subdirectory inside it.
    for (let f of readdirSync(file)) {                             // Call the search function recursively on each file/subdirectory.
      search(file + "/" + f);
    }
  } 
  else if (searchTerm.test(readFileSync(file, "utf8"))) {          // If it's a file, read its contents and check if the search term matches the file's content.
       console.log(file);                                          // If a match is found, print the file name to the console.
 
  }
}
