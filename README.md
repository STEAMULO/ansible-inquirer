# Ansible Inquirer

Based on <https://github.com/SBoudrias/Inquirer.js>

Ansible wrapper simplifying ansible adhoc and ansible-playbook calls.

# Launch cmd wrapper

You can use only the launch shell command wrapper :

    ansible_inquirer.confirmAndLaunchCmd('ls -lha');
    
# Launch playbook or adhoc wrapper

The Ansible launch playbook or adhoc wrapper automatically adds several basics questions before launching the action :

- "-u" param : what's the ssh user
- "-i" param : what's the inventory file to use
- "-l" param : which environment is targeted
- "--check" param : test mode
- other raw params to send

All default values can be override :

    var exports = module.exports = {
        limits: ['all', 'autre'],
        limit_default: ['all'],
        users: ['steamulo'],
        user_default: 'steamulo',
        hosts: ['hosts'],
        host_default: 'hosts'
    };

All questions can be skipped by specifying default value as last param.
The object :

    {
        user: 'root',
        hosts: ['host-prod'],
        limit: ['webfronts'],
        checkMode: false,
        extra: ' -e "ansible_var=xxx" '
    }

Exemples :

    ansible_inquirer.launchAdhoc('df -h', , {user: 'my_custom'});
    ansible_inquirer.launchPlaybook('df -h', , {limit: 'my_environment'});


# Use all within the recurse method

The recurse method simplify inquirer's way to do cascading prompts list. It can be used with ansible wrapper

    ansible_inquirer.recursePrompts([
        {
            type: 'list',
            message: 'What do you want to do ?',
            name: 'nextQuestions',
            choices: [
                {
                    name: 'See metrics',
                    value: {
                        type: 'list',
                        message: 'Which one ?',
                        name: 'nextQuestions',
                        choices: [
                            {name: 'Disc usage', value: function(nextQuestions, answers){ansible_inquirer.launchAdhoc('df -h', answers)} }
                            {name: 'Date and time', value: function(nextQuestions, answers){ansible_inquirer.launchAdhoc('date', answers)} }
                        ]
                    }
                },
                {
                    name: 'Launch test playbook with tag filter',
                    value: function(nextQuestions, answers){
                        ansible_inquirer.launchPlaybook('test.yml', '-t my_tag', answers);
                    }
                }
            ]
        }
    ]);