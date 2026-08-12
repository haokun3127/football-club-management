import { runSecureCqTalentTestAccountCommand } from "./secure-cq-talent-test-accounts-cli.js";

const result = runSecureCqTalentTestAccountCommand(process.argv.slice(2), process.env);
console.log(JSON.stringify(result));
