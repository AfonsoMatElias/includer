const inc = {
    /**
     * Html main includer function
     * @param {string} path - the filepath that needs to be included 
     * @param {Function} cb - the function that needs to be called alfer the true response.
     */
    async mainIncluder(path, cb) {
        // fetch function to get the file
        let result = await fetch(path, {
            // setting the method
            method: 'get',
            // the default header content type
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        // Checking if the response is ok
        if (result.ok) {
            // Calling the callback
            cb(await result.text());
        } else {
            // Printing the error on the execution
            console.error(`Something went wrong. \nFile: ${path}. \nDescription: ${ result.statusText }`);
        }
    },

    /**
     * Html includer main function
     * @param {string} path - the filepath of the element that will be included. 
     * @param {HTMLElement} inc - the inc element that the content will be included. 
     */
    async include(path, elem) {
        // Checking if the 1st arg is null 
        if (path == 'null.html') {
            // Printing the error messagr
            console.error('Error: attribute "src" must have a value', elem);
            // Breaking the execution
            return;
        }
        // Verifying if the include needs to be ignored
        if (path == 'inc.html') return;

        if (path == 'this.html') {
            path = elem.getAttribute('default');
            if (!path) return;
            path += '.html';
        }

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
    async render(path, main, title) {
        // Defining the main master page if it's not defined
        path = path ? path + '.html' : path || '_master_.html';
        // Calling the main includer function
        await inc.mainIncluder(path, async function (result) {
            // Getting the main document
            let elem = inc.d.documentElement;
            // Filling the document with the master content value
            elem.innerHTML = result;
            // Selecting the inc defined in the master
            let incs = inc.allIncs(inc.d);
            // Checking if the master element was found
            if (incs.length) {
                // Checking if the title was defined
                if (title)
                    // Setting the page title
                    inc.d.title = title;
                // Inserting the old content and running the other incd
                for (const incElem of incs) {
                    // Getting the inc value
                    let v = inc.src(incElem);
                    // Checking if the is the main container
                    if (v == 'this') {
                        // Adding the main section
                        await inc.mainIncluder(main, function (res) {
                            // Setting the main content
                            incElem.innerHTML = res;
                        });
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
                for(let cb of inc.loadedEvents) {
                    cb(inc.d);
                }
            } else {
                // Printing the error message
                console.error(`Something went wrong. Description: 'inc' tag or inc-src attribute not found.`);
            }
        });
    },

    /**
     * Add the functions to be called when the page is fully loaded
     * @param {*} cb - the callback function 
     */
    loaded(cb) {
        // Adding the event that needs to be fired
        inc.loadedEvents.push(cb);
    },

    /**
     * Funciton that will be call after an inc be added, if it's defined
     * @param {HTMLElement}  - the added element  
     */
    added(cb){
        // Adding the event that needs to be fired
        inc.addedEvent = cb;
    },

    /**
     * Function to observe the DOM
     */
    observe() {
        // Observing any change that can be made in the DOM
        new MutationObserver(function (mutation) {
                // Looping the mutations
                mutation.forEach(async function (e) {
                    // Looping the added nodes
                    for (let n of e.addedNodes)
                        // Checking if the current element is the in one
                        if (n.nodeName.toLowerCase() == 'inc' || 
                           (typeof n.hasAttribute != 'undefined' && n.hasAttribute('inc-src'))) {
                            // Calling the inc function
                            inc.include(`${inc.src(n)}.html`, n);
                        }
                    // Otherwise
                    else {
                        try {
                            // Getting all the inc elements inside of the element
                            let incs = inc.allIncs(n);
                            // Looping them
                            for (let incElem of incs)
                                // Calling the inc function for each one of them
                                await inc.include(`${inc.src(incElem)}.html`, incElem);

                            let links = [];
                            // Checking if the current element is an anchor and has the reload property
                            if (n.localName == 'a' && n.hasAttribute('reload'))
                                // Setting a list of this element
                                links = [n];
                            // Otherwise
                            else
                                // Getting all the anchors with reload value
                                links = n.querySelectorAll('a[reload]');

                            // Watching the link elements
                            inc.watchLinks({
                                // Getting the links
                                links: links,
                                // Setting the action that will be fired
                                action: async function (href, ttle) {
                                    // Getting the inc element
                                    let incElem = inc.d.querySelector('inc[src="this"]') || inc.d.querySelector('[inc-src="this"]');
                                    // Calling the main includer function
                                    await inc.mainIncluder(href, function (html) {
                                        // Checking if the element was found
                                        if (incElem) {
                                            // Setting the content
                                            incElem.innerHTML = html;
                                            // Updating the url
                                            window.history.pushState(html, ttle, href);
                                        } else {
                                            console.error(`Error: <inc src="this"></inc> not found, please check define it.`);
                                        }
                                    });
                                    return incElem;
                                }
                            });

                        } catch {}
                    }
                    // Setting watch to true
                    if (!inc.watch) inc.watch = true;
                });
            })
            // Observing the DOM
            .observe(inc.d, {
                // Listening the childs
                childList: true,
                // Listening the childs of the main child
                subtree: true
            });
    },

    /**
     * Link watcher for reload type page
     * @param {Object} v - Watch links object setup   
     */
    watchLinks(v) {
        let elem = [];
        // Getting the links
        elem = v.links == null ? inc.d.querySelectorAll('a[reload]') : v.links;
        // Looping them
        for (let a of elem) {
            // Adding the event listener
            a.addEventListener('click', async function (ev) {
                // Getting the href attr value
                let href = ev.target.getAttribute('href');
                // Checking if it got a valid value
                if (href != null && href != 'null' && href != '#') {
                    // Preventing the default action
                    ev.preventDefault();
                    // Calling the action that will be fired
                    let container = await v.action(href, ev.target.getAttribute('pTitle') || href);
                    // Setting the page title 
                    let title = ev.target.getAttribute('pTitle');
                    if(title) inc.d.title = title;

                    // Checking if the added function is not defined
                    if(inc.added != null)
                        // Calling the added function
                        inc.addedEvent(container);
                    
                    // Geeting the main inc
                    let _inc_ = inc.d.querySelector('inc[src="this"]') || inc.d.querySelector('[inc-src="this"]');
                    // Checking if it's valid
                    if (_inc_)
                        // Looping the scripts
                        for (let s of _inc_.querySelectorAll('script'))
                            // Evaluating the scripts
                            eval(s.innerHTML);
                }
            });
        }
    },

    /**
     * Includer initializer function
     */
    init() {
        let _script_ = inc.d.currentScript;
        // Checking if a render script was found
        if (_script_ && _script_.hasAttribute('render')) {
            // Stoping the loading process
            window.stop();
            (async function () {
                // Calling the render function
                await inc.render(_script_.getAttribute('render'), window.location.pathname, _script_.getAttribute('title'));
                // Calling the DOM observer
                inc.observe();
            })();
        } else {
            // Listening the main document event 
            inc.d.addEventListener('DOMContentLoaded', async function (e) {
                // Calling the DOM observer
                inc.observe();
                // Finding all the includes tags
                let incs = inc.allIncs(inc.d);
                // Looping them
                for (let elem of incs)
                    // including them
                    await inc.include(`${inc.src(elem)}.html`, elem);

                // Calling all the loaded events
                inc.loadedEvents.forEach(function (cb) {
                    cb(e);
                });
            });
        }
    },

    // Auxiliary variables and functions
    
    /**
     * Helper to get the source value a inc value 
     * @param {INCElement} elem - the inc element
     */
    src(elem) {
        // getting the value of the attribube src ou inc-src
        return elem.getAttribute('src') || elem.getAttribute('inc-src');
    },

    /**
     * Helper to get all the include element into an element
     * @param {HTMLElement} source 
     */
    allIncs(source){
        // Aux inc list
        let incs = [];
        // Getting all inc tags
        incs.push.apply(incs, [].slice.call(source.querySelectorAll('inc')));
        // Getting all inc source attributes and looping them
        for (const e of [].slice.call(source.querySelectorAll('[inc-src]')))
            // Checking if it's doesn't exist
            if(!incs.includes(e))
                // Adding it to the array
                incs.push(e);
        // Returning every elements added
        return incs;
    },

    // list of loaded events to be fired up
    loadedEvents: [],

    // list of loaded events to be fired up
    addedEvent: null,

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

    // Some alias
    d: document
}

// Initializing the includer
inc.init();