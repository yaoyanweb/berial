let queue: any[] = []

export function run(code: string, options: any = {}): any {
  try {
    if (checkSyntax(code)) {
      const handler = {
        get(obj: any, prop: string): any {
          return Reflect.has(obj, prop) ? obj[prop] : null
        },
        set(obj: any, prop: string, value: any): boolean {
          Reflect.set(obj, prop, value)
          return true
        },
        has(obj: any, prop: string): boolean {
          return obj && Reflect.has(obj, prop)
        }
      }
      const captureHandler = {
        get(obj: any, prop: string): any {
          return Reflect.get(obj, prop)
        },
        set(): boolean {
          return true
        },
        has(): boolean {
          return true
        }
      }

      const allowList = {
        IS_BERIAL_SANDBOX: true,
        __proto__: null,
        console,
        String,
        Number,
        Array,
        Symbol,
        Math,
        Object,
        Promise,
        RegExp,
        JSON,
        Date,
        Function,
        parseInt,
        document,
        navigator,
        location,
        performance,
        MessageChannel,
        SVGElement,
        HTMLElement,
        HTMLIFrameElement,
        history,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Error,
        localStorage,
        decodeURI,
        encodeURI,
        decodeURIComponent,
        encodeURIComponent,
        fetch: fetch.bind(window),
        setTimeout: setTimeout.bind(window),
        clearTimeout: clearTimeout.bind(window),
        setInterval: setInterval.bind(window),
        clearInterval: clearInterval.bind(window),
        requestAnimationFrame: requestAnimationFrame.bind(window),
        cancelAnimationFrame: cancelAnimationFrame.bind(window),
        addEventListener: addEventListener.bind(window),
        removeEventListener: removeEventListener.bind(window),
        // eslint-disable-next-line no-shadow
        eval: function (code: string): any {
          return run('return ' + code, {})
        },
        alert: function (): void {
          alert('Sandboxed alert:' + arguments[0])
        },
        // position related properties
        innerHeight,
        innerWidth,
        outerHeight,
        outerWidth,
        pageXOffset,
        pageYOffset,
        screen,
        screenLeft,
        screenTop,
        screenX,
        screenY,
        scrollBy,
        scrollTo,
        scrollX,
        scrollY,
        // custom allow list
        ...(options.allowList || {})
      }

      if (!Object.isFrozen(String.prototype)) {
        for (const k in allowList) {
          const fn = allowList[k]
          if (typeof fn === 'object' && fn.prototype) {
            Object.freeze(fn.prototype)
          }
          if (typeof fn === 'function') {
            Object.freeze(fn)
          }
        }
      }
      const proxy = new Proxy(allowList, handler)
      const capture = new Proxy(
        {
          __proto__: null,
          proxy,
          globalThis: new Proxy(allowList, handler),
          window: new Proxy(allowList, handler),
          self: new Proxy(allowList, handler)
        },
        captureHandler
      )
      return Function(
        'proxy',
        'capture',
        `with(capture) {     
            with(proxy) {  
              return (function(){                                               
                "use strict";
                ${code};
                return window
              })();
            }
        }`
      )(proxy, capture)
    }
  } catch (e) {
    throw e
  }
}

export function observeDoucument(): any {
  new MutationObserver((mutations) => {
    mutations.forEach(async (m: any) => {
      switch (m.type) {
        case 'childList':
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i]
            if (node instanceof HTMLScriptElement) {
              const src = node.getAttribute('src') || ''
              queue.push({ target: m.target, src })
            }
          }
          break
        default:
      }
    })
  }).observe(document, { childList: true, subtree: true })
}

export function getcurrentQueue(host: any): any {
  let q = queue.filter((v: any) => v.target != host).map((v: any) => v.src) // save
  queue.length = 0 // cleanup
  return q
}

function checkSyntax(code: string): boolean {
  if (/\bimport\s*(?:[(]|\/[*]|\/\/|<!--|-->)/.test(code)) {
    throw new Error('Dynamic imports are blocked')
  }
  return true
}
