/*
 * Index = diagnostics and setup process.
 */

exports.index = function(req, res){
  console.log(
    "--- CONFIG:\n" +
    "CLIENT_ID %s\n" +
    "CLIENT_SECRET %s\n" +
    "DESTINATION_URL %s\n" +
    "VERIFY_TOKEN %s\n",
    $env.client_id,
    $env.client_secret,
    $env.destination_url,
    $env.verify_token
  );
  res.render('index', {env: $env});
};
