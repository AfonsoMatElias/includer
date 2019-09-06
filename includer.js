const inc = {
    /**
     * Html main includer function
     * @param {string} path - the filepath that needs to be included 
     * @param {Function} cb - the function that needs to be called alfer the true response.
     */
    mainIncluder: async function (path, cb) {
        // fetch function to get the file
        await fetch(path, {
                // including the content
                method: 'get',
                // the default content type
                headers: {
                    'Content-Type': 'text/plain'
                }
            })
            // Dealing with returned data
            .then(async result => {
                // Checking if the response is ok
                if (result.ok)
                    // Calling the callback
                    cb(await result.text());
                else
                    // Printing the error on the execution
                    console.error(`Something went wrong. Description: ${ result.statusText }`);
            })
            // Catching and printing the error
            .catch(async x => console.error(`Something went wrong. Description: ${ await result.text() }`));
    },

    /**
     * Html includer main function
     * @param {string} path - the filepath of the element that will be included. 
     * @param {HTMLElement} inc - the inc element that the content will be included. 
     */
    include: async function (path, elem) {
        // Checking if the 1st arg is null 
        if (path == 'null.html') {
            // Printing the error messagr
            console.error('Error: attribute "src" must have a value', elem);
            // Breaking the execution
            return;
        }
        // Verifying if the include needs to be ignored
        if (path == 'inc.html') return;
        // Calling the main includer function
        await inc.mainIncluder(path, function (result) {
            // Adding the content
            if (elem.hasAttribute('data')) {
                // Defining a generic object
                let _model_ = null;
                // Getting the name of the data
                let _name_ = elem.getAttribute('data');
                try {
                    // Getting the value
                    _model_ = eval(_name_);
                    // Setting up all the combinations
                    result = modelHandler.i_setter(result, _model_);
                } catch (e) {
                    // Printing the error message
                    console.error(`The data '${_name_}' couldn't be loaded... try to define it in the global scope!`, `\nMore Details:`, e.message)
                }
            }
            elem.innerHTML += result;
            // Looping the scripts
            for (let s of elem.querySelectorAll('script'))
                // Evaluating them
                eval(s.innerHTML);
        });
    },

    /**
     * Html master page handler
     * @param {string} path - the master page filepath
     */
    render: async function (path, main) {
        // Defining the main master page if it's not defined
        path = path ? path + '.html' : path || '_master_.html';
        // Calling the main includer function
        await inc.mainIncluder(path, async function (result) {
            // Getting the main document
            let elem = document.documentElement;
            // Filling the document with the master content value
            elem.innerHTML = result;
            // Selecting the inc defined in the master
            let incs = document.querySelectorAll('inc');
            // Checking if the master element was found
            if (incs.length) {
                // Inserting the old content and running the other incd
                for (const incElem of incs) {
                    // Getting the inc value
                    let v = incElem.getAttribute('src');
                    // Checking if the is the main container
                    if (v == 'this') {
                        // Adding the main section
                        await inc.mainIncluder(main, function (res) {
                            incElem.innerHTML += res;
                        });
                        // Pushing all the script already evaluted
                    }
                    // Otherwise  
                    else
                        // Calling the default includer function
                        await inc.include(`${v}.html`, incElem);
                }
                // Looping the scripts
                for (let s of elem.querySelectorAll('script')) {
                    // Evaluating them
                    eval(s.innerHTML);
                }

                // Calling all the loaded events
                inc.events.forEach(function (cb) {
                    cb(document);
                });
                
            } else {
                // Printing the error message
                console.error(`Something went wrong. Description: 'inc' tag not found.`);
            }
        });
    },

    // list of events to be fired up
    events: [],

    /**
     * Add the functions to be called when the page is fully loaded
     * @param {*} cb - the callback function 
     */
    loaded: function (cb) {
        inc.events.push(cb);
    },

    // Model Properties handler
    modelHandler: {
        /**
         * Function to check if it has some variables to be replaced
         * @param {string} v - the content that needs to be checked 
         */
        i_checker: function (v) {
            // Checking if some string combine the regex
            return v ? v.match(/-i-[^-]*-/g) : [];
        },
        /**
         * Function to handler the setup of the string content
         * @param {string} content - the content that needs to be placed
         * @param {Object} model - the model that the value will be got
         */
        i_setter: function (content, model) {
            // Getting the combinations
            let combinations = inc.i_checker(content);
            // Looping them
            for (const c of combinations) {
                // Aux var to deal with a combination
                let value = "";
                // Adding the combination
                value += c;
                // Removing the -i-
                value = value.replace('-i-', '');
                // Removing the last dash
                value = value.substr(0, value.length - 1); // Removing the delimiter 
                try {
                    // Getting the value from de model
                    value = eval(`model${value ? '.' + value : value}`);
                } catch (e) {
                    // Setting null because it was not found
                    value = 'null';
                }
                // Replacing the -i-[Prop]- to the Real value
                content = content.replace(c, value);
            }
            return content;
        }
    },

    /**
     * Function to observe the DOM
     */
    observe: function () {
        // Observing any change that can be made in the DOM
        new MutationObserver(function (mutation) {
            // Looping the mutations
            mutation.forEach(function (e) {
                // Looping the added nodes
                for (let n of e.addedNodes)
                    // Checking if the current element is the in one
                    if (n.nodeName.toLowerCase() == 'inc')
                        // Calling the inc function
                        inc.include(`${n.getAttribute('src')}.html`, n);
            })
        })
        // Observing the DOM
        .observe(document, {
            // Listening the childs
            childList: true,
            // Listening the childs of the main child
            subtree: true
        });
    },

    /**
     * Includer initializer function
     */
    init: function name() {
        let _script_ = document.currentScript;
        // Checking if a render script was found
        if (_script_ && _script_.hasAttribute('render')) {
            // Stoping the loading process
            window.stop();
            (async function () {
                // Calling the render function
                await inc.render(_script_.getAttribute('render'), window.location.pathname);        
                
                // Calling the DOM observer
                inc.observe();
            })();

        }else{

            // Listening the main document event 
            document.addEventListener('DOMContentLoaded', async function (e) {
                // Finding all the includes tags
                let incs = document.querySelectorAll('inc');
                // Looping them
                for (let elem of incs)
                    // including them
                    await inc.include(`${elem.getAttribute('src')}.html`, elem);

                // Calling the DOM observer
                inc.observe();

                // Calling all the loaded events
                inc.events.forEach(function (cb) {
                    cb(e);
                });
            });
        }       
    }
}

// Initializing the includer
inc.init();