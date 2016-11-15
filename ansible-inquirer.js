'use strict';
var inquirer = require('inquirer'),
    child_process = require('child_process'),
    debug = require('debug')('ansible-inquirer'); // To use debug mode : 'DEBUG=ansible-inquirer npm start'

var exports = module.exports = {
    limits: ['all', 'autre'],
    limit_default: ['all'],
    users: ['steamulo'],
    user_default: 'steamulo',
    hosts: ['hosts'],
    host_default: 'hosts'
};

var inquirerAnsibleParams = function(skips){
    skips = skips || {};
    var prompts = [
        {
            type: 'input',
            name: 'user',
            message: 'Quel utilisateur utiliser ?',
            default: exports.user_default,
            when: function(){
                return exports.users.length <= 1;
            }
        },
        {
            type: 'list',
            name: 'user',
            message: 'Quel utilisateur utiliser ?',
            choices: exports.users,
            default: exports.user_default,
            when: function(){
                return exports.users.length > 1;
            }
        },
        {
            type: 'input',
            name: 'hosts',
            message: 'Quel fichier d\'environnement utiliser ?',
            default: exports.host_default,
            when: function(){
                return exports.hosts.length <= 1;
            }
        },
        {
            type: 'list',
            name: 'hosts',
            message: 'Quel fichier d\'environnement utiliser ?',
            choices: exports.hosts,
            default: exports.host_default,
            when: function(){
                return exports.hosts.length > 1;
            }
        },
        {
            type: 'checkbox',
            name: 'limit',
            message: 'Quelle(s) cible(s) de hosts ?',
            choices: exports.limits,
            default: exports.limit_default
        },
        {
            type: 'input',
            name: 'limit',
            message: 'Cible custom ?',
            default: 'all',
            when: function(answers){
                return !answers.limit || answers.limit.length === 0 || (answers.limit.length === 1 && answers.limit[0] === 'autre');
            }
        },
        {
            type: 'confirm',
            name: 'checkMode',
            message: 'Mode test ?',
            default: true
        },
        {
            type: 'input',
            name: 'extra',
            message: 'D\'autres options ?'
        }
    ];

    var filtered = prompts.filter(function(elt){
        return skips[elt.name] === undefined;
    });

    debug(filtered);
    return inquirer.prompt(filtered);
};

/**
 * Launch a shell command after a prompt confirm
 *
 * @param cmd : command to launch (string)
 * @param cb : callback functions after confirm (and command end)
 */
exports.confirmAndLaunchCmd = function(cmd, cb){
    inquirer.prompt({ type: 'confirm', name: 'confirm', message: 'Exécuter ('+cmd+') ?'})
        .then(function(answers){
            if( answers.confirm ) {
                console.log('Lancement du script "' + cmd + '" ...');
                child_process.execSync(cmd, {stdio: [0, 1, 2]});
            } else {
                console.log('Ok, bye !');
            }
            cb();
        });
};

/**
 * Launch an ansible adhoc command with structured params
 *
 * @param cmd : bash command to launch (string)
 * @param skips : all prompts that needs to be filtered { checkMode: false }
 */
exports.launchAdhoc = function(cmd, skips){
    skips = skips || {};
    skips.checkMode = false;
    inquirerAnsibleParams(skips).then(function(params){
        params = Object.assign({}, skips, params);

        exports.confirmAndLaunchCmd(
            'ansible '
            + [params.limit].join(',')
            + (params.hosts ? ' -i ' +params.hosts : ' -i hosts')
            + ' -u ' +params.user
            + ' -a "'  + cmd + '"'
            + (params.checkMode ? ' --check ' : '')
            + (params.extra || '')
        );
    });
};

/**
 * Launch an ansible playbook with tags and vars and structured params
 *
 * @param playbook : playbook.yml to launch
 * @param tagsVars : string for tags, skip-tags or extra-vars
 * @param skips : all prompts that needs to be filtered { checkMode: false }
 */
exports.launchPlaybook = function(playbook, tagsVars, skips){
    inquirerAnsibleParams(skips).then(function(params) {
        params = Object.assign({}, skips, params);

        exports.confirmAndLaunchCmd(
            'ansible-playbook '
            + playbook
            + (params.limit && params.limit !== 'all' ? ' -l ' + [params.limit].join(',') : '')
            + (params.env ? ' -i ' + params.env : ' -i hosts')
            + ' -u ' + params.user + ' '
            + (tagsVars || '')
            + (params.checkMode ? ' --check ' : '')
            + (params.extra || '')
        );
    });
};


/**
 * Private method for recurse work with inquirer
 * 
 * @param nextQuestions : at iteration i, the questions to come
 * @param answers : at iteration i, answers already given with non recurse prompts
 * @param lastQuestions : at iteration i, the last questions list answered
 */
var recurse = function(nextQuestions, answers, lastQuestions) {
    debug('nextQuestions: %j', nextQuestions);
    debug('answers %j', answers);
    debug('lastQuestions: %j', lastQuestions);
    if (typeof nextQuestions === "function") {
        debug('function');
        // la value de la question est une fonction, on lance la fonction
        nextQuestions(nextQuestions, answers);
    } else if( nextQuestions instanceof Array || nextQuestions === Object(nextQuestions) ){
        debug('prompt');
        // les questions suivantes sont un tableau ou un objet, on continue la boucle
        inquirer.prompt(nextQuestions).then(function(newAnswers){
            debug('newAnswers: %j', newAnswers);
            recurse(newAnswers.nextQuestions, Object.assign({}, newAnswers, answers), nextQuestions);
        });
    } else if(lastQuestions && typeof lastQuestions.cb === "function") {
        debug('cb');
        // la question de la réponse contient un callback que l'on lance (input texte)
        lastQuestions.cb(nextQuestions, answers);
    } else if(lastQuestions instanceof Array && typeof lastQuestions[lastQuestions.length-1].cb === "function") {
        debug('arraycb');
        // la dernière question de la liste de la réponse contient un callback que l'on lance (input texte en fin de liste)
        lastQuestions[lastQuestions.length-1].cb(nextQuestions, answers);
    }
};

/**
 * Use inquirer JS with recursive option (put next questions in value or new "cb" param for no choice prompts)
 *
 * @param questions : inquirer formated prompts list
 */
exports.recursePrompts = function(questions) {
    recurse(questions, {}, undefined);
};