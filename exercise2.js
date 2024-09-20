//Exercise2= Directory creation


//MKCOL method to handle directory creation
methods.MKCOL = async function(request) {
  let path = urlPath(request.url);
  try {
    stats = await stat(path); // Check if the path already exists
  } catch (error) {
    // If the directory doesn't exist, create it
    if (error.code != "ENOENT") throw error;
    await mkdir(path);
    return {status: 204}; // Return 204 to indicate the directory was created
  }

  // If the path is already a directory, return 204 (no need to create)
  if (stats.isDirectory()) return {status: 204};
  else return {status: 400, body: "Not a directory"}; // If it's not a directory, return 400 (bad request)
};
