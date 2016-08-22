const constants = require('../constants');
const utils = require('../utils');
const path = require('path');

const register = (context, title) => {
  const appDir = path.resolve('.');
  context.line(`Registering a new app on Zapier named "${title}"`);
  context.line();

  return utils.checkCredentials()
    .then(() => {
      utils.printDone();
      utils.printStarting(`Confirming registation of app "${title}"`);
      return utils.callAPI('/apps', {
        method: 'POST',
        body: {
          title: title
        }
      });
    })
    .then((app) => {
      utils.printDone();
      utils.printStarting(`Linking app to current directory with \`${constants.CURRENT_APP_FILE}\``);
      return utils.writeLinkedAppConfig(app, appDir);
    })
    .then(() => {
      utils.printDone();
      context.line('\nFinished! You can edit `index.js` then `zapier push` to build & upload a version of your app!');
    });
};
register.argsSpec = [
  {name: 'title', required: true, example: 'My App Name'}
];
register.argOptsSpec = {
};
register.help = 'Registers a new app in your account.';
register.example = 'zapier register "Example"';
register.docs = `\
This command registers your app with Zapier. After running this, you can run \`zapier push\` to deploy a version of your app that you can use in your Zapier editor.

> This will change the  \`./${constants.CURRENT_APP_FILE}\` (which identifies the app assosciated with the current directory).

**Arguments**

${utils.argsFragment(register.argsSpec)}
${utils.argOptsFragment(register.argOptsSpec)}

${'```'}bash
$ zapier register "Example"
# Let\'s register your app "Example" on Zapier!
#
#   Creating a new app named "Example" on Zapier - done!
#   Setting up .zapierapprc file - done!
#   Applying entry point file - done!
#
# Finished!
${'```'}
`;

module.exports = register;
