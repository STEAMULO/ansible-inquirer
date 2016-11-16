'use strict';
var ansible_inquirer = require('./ansible-inquirer.js');

ansible_inquirer.limits = ['all', 'bdd', 'front'];
ansible_inquirer.user_default = 'project-user';
ansible_inquirer.users = ['root', 'project-user'];
ansible_inquirer.hosts = [{name: 'production', value: 'hosts/hosts-prod'}, {name: 'pré-production', value: 'hosts/hosts-preprod'}];
ansible_inquirer.host_default = 'hosts/hosts-preprod';

ansible_inquirer.recursePrompts([
    {
        type: 'list',
        message: 'What to do ?',
        name: 'nextQuestions',
        choices: [
            {
                name: 'Update Galaxy',
                value: function(){ ansible_inquirer.confirmAndLaunchCmd('rm -rf $(find roles -maxdepth 1 -mindepth 1 -not -name requirements.yml) && ansible-galaxy install -r roles/requirements.yml -p roles --force'); }
            },
            {
                name: 'Test a playbook',
                value: function(){ ansible_inquirer.launchPlaybook('test.yml', {tags: 'deploy', skipTags: 'restart', extra: 'ansible_become=false'}); }
            },
            {
                name: 'Show metrics',
                value: {
                    type: 'list',
                    message: 'What metric ?',
                    name: 'nextQuestions',
                    choices: [
                        {name: 'Disc usage', value: function(nextQuestions, answers){ansible_inquirer.launchAdhoc('df -h', answers)} },
                        {
                            name: 'User\'s ssh keys authorized',
                            value: {
                                type: 'input',
                                name: 'nextQuestions',
                                message: 'A pattern to filter on ?',
                                cb: function(nextQuestions, answers){ansible_inquirer.launchAdhoc('grep -EH \''+nextQuestions+'\' ~/.ssh/authorized_keys', answers);}
                            }
                        }
                    ]
                }
            }
        ]
    }
]);