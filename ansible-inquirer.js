'use strict';
var inquirer = require('inquirer'),
    child_process = require('child_process'),
    debug = require('debug')('ansible-inquirer'); // To use debug mode : 'DEBUG=ansible-inquirer npm start'

var exports = module.exports = {
    limits: ['all', 'autre'],
    limit_default: ['all'],
    users: ['steamulo'],
    user_default: 'steamulo',
    inventories: ['hosts'],
    inventory_default: 'hosts'
};

var inquirerAnsibleParams = function(params){
    params = params || {};
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
            name: 'inventory',
            message: 'Quel fichier d\'inventaire utiliser ?',
            default: exports.inventory_default,
            when: function(){
                return exports.inventories.length <= 1;
            }
        },
        {
            type: 'list',
            name: 'inventory',
            message: 'Quel fichier d\'inventaire utiliser ?',
            choices: exports.inventories,
            default: exports.inventory_default,
            when: function(){
                return exports.inventories.length > 1;
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
            name: 'others',
            message: 'D\'autres options ?'
        }
    ];

    var filtered = prompts.filter(function(elt){
        return params[elt.name] === undefined;
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
            if( typeof cb === 'function' ) cb();
        });
};

var CMD_TYPE = {ANSIBLE_ADHOC: 0, ANSIBLE_PLAYBOOK: 1};
var serializeParams = function(type, params){
    debug('type= '+type);
    debug('params= '+params);

    if( !params.inventory  ) throw new Error("Ansible inventory should be defined (params.inventory)");
    if( type === CMD_TYPE.ANSIBLE_PLAYBOOK && !params.playbook  ) throw new Error("Ansible playbook should be defined (params.playbook)");

    return (type === CMD_TYPE.ANSIBLE_ADHOC ? 'ansible' : '')
        + (type === CMD_TYPE.ANSIBLE_ADHOC ? (params.limit ? ' ' + [params.limit].join(',') : ' all') : '')
        + (type === CMD_TYPE.ANSIBLE_ADHOC && params.module ? ' -m ' + params.module : '')
        + (type === CMD_TYPE.ANSIBLE_ADHOC && params.action ? ' -a "' + params.action + '"' : '')
            
        + (type === CMD_TYPE.ANSIBLE_PLAYBOOK ? 'ansible-playbook' : '')
        + (type === CMD_TYPE.ANSIBLE_PLAYBOOK ? ' ' + params.playbook : '')
        + ' -i ' + params.inventory
        + (type === CMD_TYPE.ANSIBLE_PLAYBOOK && params.limit ? ' -l '+[params.limit].join(',') : '')
        + (params.user ? ' -u ' + params.user : '')
        + (params.tags ? ' -t ' + [params.tags].join(',') : '')
        + (params.skipTags ? ' --skip-tags ' + [params.skipTags].join(',') : '')
        + (params.extra ? ' -e ' + params.extra : '')
        + (params.checkMode ? ' --check ' : '')
        + (params.others ? ' ' + params.others : '')
        ;
};

/**
 * Launch an ansible adhoc command with structured params
 *
 * @param action : action to launch or params if method is used
 * @param module : ansible module used (default shell)
 * @param params : all adhoc params
 */
exports.launchAdhoc = function(module, action, params){
    params = params || {};
    params.checkMode = false;
    inquirerAnsibleParams(params).then(function(params){
        params = Object.assign({}, params, params);
        params.module = params.module || module;
        params.action = params.action || action;

        exports.confirmAndLaunchCmd(serializeParams(CMD_TYPE.ANSIBLE_ADHOC, params));
    });
};

/**
 * Launch an ansible playbook with tags and vars and structured params
 *
 * @param playbook : playbook.yml to launch
 * @param params : all playbook params
- */
exports.launchPlaybook = function(playbook, params){
    inquirerAnsibleParams(params).then(function(params2) {
        params = Object.assign({}, params, params2);
        params.playbook = params.playbook || playbook;

        exports.confirmAndLaunchCmd(serializeParams(CMD_TYPE.ANSIBLE_PLAYBOOK, params));
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