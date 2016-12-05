function formatJSONForBot(input) {
  return input.replace(/,/g, "\n").replace("{", "").replace("}", "");
}

exports.formatJSONForBot = formatJSONForBot;
