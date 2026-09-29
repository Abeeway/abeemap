export let setCookie = (cname: string, cvalue: string, exSeconds: number, path: string) => {
    if (typeof(path) === 'undefined') { path = '/'; }
    const d = new Date();
    d.setTime(d.getTime() + (exSeconds * 1000));
    document.cookie = `${cname}=${cvalue}; expires=${d.toUTCString()}; path=${path}`;
};

export let getCookie = (cname: string) => {

    /*
    const name = cname + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    */

    const fragments = document.cookie.split(';');
    for (let fragment of fragments) {
        while (fragment.charAt(0) === ' ') {
            fragment = fragment.substring(1);
        }
        if (fragment.indexOf(cname + '=') === 0) {
            return fragment.substring(cname.length + 1, fragment.length);
        }
    }

    return '';

    /*
    const regexp = new RegExp('(?:(?:^|.*;\\s*)' + cname + '\\s*\\=\\s*([^;]*).*$)|^.*$');
    return document.cookie.replace(regexp, '$1');
    */

};

export let deleteCookie = (cname: string, path: string) => {
    if (typeof(path) === 'undefined') {	path = '/'; }
    const d = new Date();
    d.setTime(d.getTime() - 1000);
    document.cookie = `${cname}=; expires=${d.toUTCString()}; path=${path}`;
};

export let generateState = () => {
    const r1 = Math.random().toString(36).substring(2, 15);
    const r2 = Math.random().toString(36).substring(2, 15);
    const r3 = Math.random().toString(36).substring(2, 13);
    return r1 + r2 + r3;
};

export let getQueryParams = ( href: string ) => {
    const re = /[?&]([^=#&]+)=([^&#]*)/g;
    let match: any;
    let isMatch = true;
    const matches: {[key: string]: string;} = {};
    while (isMatch) {
        match = re.exec(href);
        if (match !== null) {
            matches[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
            if (match.index === re.lastIndex) {
                re.lastIndex++;
            }
        } else {
            isMatch = false;
        }
    }
    return matches;
};

export let querystringify = (params:any) => {
    let querystring = '';
    const paramsArray = Object.entries(params);
    const paramsArrayLength = paramsArray.length;
    for (let i = 0; i < paramsArrayLength; i++) {
        if (i > 0) { querystring += '&'; }
        querystring += paramsArray[i][0] + '=' + encodeURIComponent( '' + paramsArray[i][1] );
    }
    return querystring;
};
