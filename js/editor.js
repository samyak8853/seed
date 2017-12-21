const { h, render, Component } = preact;
const { route, Router, Link } = preactRouter;

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const INITIAL_TEXT = `root:
- Dear {{ giver }}, thank you for the {{ object }}.
- Hey {{ giver }}, thanks for the {{ object }}!

giver:
- Aunt Emma
- Dave and Edna
- Uncle Bob

object:
- purple vase
- golden retriever
- dishwasher
`;

const GALLERY = [
    '-L0jLr9zuG9hCdjS-VE7',
    '-L0jT5zaERgBPaf3P6LP',
    '-L0kpeO-JzFHMPcVoiTm',
    '-L0kqamyYh6GE9_nE6xn',
    '-L0kzMILE3LZTE_1gQg_',
    '-L0kp-8ncfHFX_pBOr6l',
    '-L0jGl9IhooqRuTF9wxS',
    '-L0jJStwcqMNLIN7H_3w',
    '-L0kGLkGKVe9Iuid9jzC',
    '-L0ktGjsgAqsUmbsNk81',
    '-L0l40nqLEV237kNmUX5',
    '-L0l7fV1tlR0Gobb64AM',
];

class SeedPicker extends Component {
    onInput(e) {
        const text = e.target.value;
        this.props.onSetSeed(text);
    }

    render(props) {
        return h('div', {class: 'seed-picker'},
            h('span', {class: 'button seed-picker__button seed-picker__prev', onClick: props.onPrevSeed}, '<'),
            h('span', {class: 'seed-picker__value'},
                h('input', {class: 'seed-picker__input', type: 'text', value: props.seed, onInput: this.onInput.bind(this)})
            ),
            h('span', {class: 'button seed-picker__button seed-picker__next', onClick: props.onNextSeed}, '>')
        )
    }
}

class Header extends Component {
    render(props) {
        return h('header', {class: 'header'},
            h(Link, {class: 'header__logo', href: '/'}, 'PCG'),
            h('nav', {class: 'header__nav'}, props.children)
        );
    }
}

class Home extends Component {
    render(props, state) {
        const thumbs = GALLERY.map(id => this.renderThumb(id));
        return h('div', {class: 'app'},
            h(Header, {},
                h(Link, {class: 'button', href: '/sketch'}, 'Create')
            ),
            h('div', {class: 'page'},
                h('section', { class: 'intro' },
                    h('p', { class: 'intro__large' },
                        'PCG is a simple app for generating procedural content. Create generated text, shapes or images using web standards.'
                    ),
                    h('div', { class: 'intro__cta' },
                        h(Link, { class: 'button primary', href:'/sketch' }, 'Get Started'),
                        h(Link, { class: 'button', href:'/docs' }, 'Documentation')
                    )
                ),
                h('section', { class: 'gallery' },
                    h('h1', {}, 'Gallery'),
                    h('div', {class: 'gallery'},
                        thumbs
                    )
                )
            )
        );
    }

    renderThumb(id) {
        return h('div', {class: 'gallery__thumb'},
            h(Link, {class: 'gallery__link', href: `/sketch/${id}`},
                h('img', {class: 'gallery__img', src: `/gallery/${id}.jpg`})
            )
        );
    }
}

class Editor extends Component {
    constructor(props) {
        super(props);
        let state = { debug: true, debugOutput: '', result: '', seed: randomTextSeed() };
        if (!props.id) {
            state.source = INITIAL_TEXT;
        } else {
            state.source = '';
            state.loading = true;
        }
        this.state = state;
    }

    generate() {
        try {
            const phraseBook = parsePhraseBook(this.state.source);
            const result = generateString(phraseBook, 'root', this.state.seed);
            this.setState({ result: result, debugOutput: '' });
            //this.setState({ debugOutput: JSON.stringify(phraseBook, null, 4) });
        } catch (e) {
            this.setState({ debugOutput: e.message });
        }
    }

    componentDidMount() {
        document.querySelector('html').classList.add('fullscreen');
        if (!this.props.id) {
            this.generate();
        } else {
            firebase.database().ref(`sketch/${this.props.id}`).once('value', snap => {
                const sketch = { key: this.props.id, ...snap.val() };
                let newState = { loading: false, source: sketch.source };
                if (sketch.seed) {
                    newState.seed = sketch.seed;
                }
                this.setState(newState);
                if (this.props.onSourceChanged) {
                    this.props.onSourceChanged(sketch.source, true);
                }
                if (this.props.onSeedChanged) {
                    this.props.onSeedChanged(newState.seed);
                }
                this.generate();
            });
        }
    }

    componentWillUnmount() {
        document.querySelector('html').classList.remove('fullscreen');
    }

    onInput(e) {
        const source = e.target.value;
        this.setState({ source });
        if (this.props.onSourceChanged) {
            this.props.onSourceChanged(source);
        }
        this.generate();
    }

    onSetSeed(seed) {
        this.setState({seed});
        if (this.props.onSeedChanged) {
            this.props.onSeedChanged(seed);
        }
        this.generate();
    }

    onGenerate() {
        let seed = nextTextSeed(this.state.seed);
        this.onSetSeed(seed);
    }

    onNextSeed() {
        let seed = nextTextSeed(this.state.seed);
        this.onSetSeed(seed);
    }

    onPrevSeed() {
        let seed = prevTextSeed(this.state.seed);
        this.onSetSeed(seed);
    }

    render(props, state) {
        const debugView = h('p', { className: 'editor__debug' }, this.state.debugOutput);
        const source = state.loading ? 'Loading...' : state.source;
        return h('div', { className: 'editor' },
            h('div', { className: 'editor__toolbar' },
                h('button', { class: 'button', onClick: this.onGenerate.bind(this) }, 'Generate'),
                h(SeedPicker, { seed: this.state.seed, onSetSeed: this.onSetSeed.bind(this), onPrevSeed: this.onPrevSeed.bind(this), onNextSeed: this.onNextSeed.bind(this) })
            ),
            h('div', { className: 'editor__panels'},
                h('div', { className: 'editor__source' },
                    h('textarea', { className: 'editor__area', value: source, onInput: this.onInput.bind(this), readonly: state.loading }),
                        debugView
                ),
                h('div', { className: 'editor__viewer' },
                    h('div', { className: 'editor__result', dangerouslySetInnerHTML: { __html: this.state.result } })
                )
            )
        );
    }
}

Editor.prototype.onInput = debounce(Editor.prototype.onInput, 200);

class Sketch extends Component {
    constructor(props) {
        super(props);
        this.state = { saving: false, unsaved: false, source: undefined, seed: undefined };
    }

    onSourceChanged(source, initialLoad) {
        this.setState({ unsaved: !initialLoad, source });
    }

    onSeedChanged(seed) {
        this.setState({ seed });
    }

    componentDidMount() {
        window.addEventListener('beforeunload', (e) => {
            let confirm = null;
            if (this.state.unsaved) {
                confirm = 'You have unsaved changes.';
                (e || window.event).returnValue = confirm;
            }
            return confirm;
        });
    }

    onSave() {
        if (this.state.saving) return;
        this.setState({ saving: true });
        let sketch = {};
        sketch.source = this.state.source;
        sketch.seed = this.state.seed;
        if (this.props.id) sketch.parent = this.props.id;
        const ref = firebase.database().ref('sketch').push();
        ref.set(sketch, () => {
            this.setState({ saving: false, unsaved: false });
            route(`/sketch/${ref.key}`);
        });
    }

    render(props, state) {
        let saveLabel = state.saving ? 'Saving...' : 'Save';
        return h('div', {class: 'app'},
            h(Header, {},
                h('button', {class: 'button' + (state.unsaved ? ' unsaved' : ''), onClick: this.onSave.bind(this), disabled: state.saving}, saveLabel)
            ),
            h(Editor, {
                id: props.id,
                onSourceChanged: this.onSourceChanged.bind(this),
                onSeedChanged: this.onSeedChanged.bind(this)
            })
        );
    }
}

class Embed extends Component {
    render(props) {
        return h('div', {class: 'app'},
            h(Editor, { id: props.id })
        );
    }
}

class Docs extends Component {
    constructor(props) {
        super(props);
        this.state = { page: undefined, html: 'Loading...' };
    }
    render() {
        return h('div', {class: 'app'},
            h(Header, {},
                h(Link, {class: 'button', href: '/sketch'}, 'Create')
            ),
            h('div', {class: 'page docs'},
                h('div', {class: 'docs__nav'},
                    h('ul', {},
                        h('li', { class: 'docs__header' }, 'Documentation'),
                        h('li', {}, h(Link, { href: '/docs' }, 'Getting Started')),
                        h('li', {}, h(Link, { href: '/docs/graphics' }, 'Generating Graphics')),
                    )
                ),
                h('div', {class: 'docs__body', dangerouslySetInnerHTML: { __html: this.state.html}})
            )
        );
    }

    onPage() {
        if (this.state.page === this.props.page) return;
        const page = this.props.page || 'index';
        fetch(`/_docs/${page}.md`)
            .then(res => res.text())
            .then(text => {
                const html = marked(text);
                this.setState({ page: this.props.page, html });
            });
    }

    componentDidMount() {
        this.onPage();
    }

    componentDidUpdate() {
        this.onPage();
    }
}

class NotFound extends Component {
    render() {
        return h('div', {class: 'app'},
            h(Header, {}),
            h('div', {class: 'page centered'},
                h('h1', {}, 'Page not found.'),
                h(Link, {href: '/'}, 'Go Back Home')
            )
        );
    }
}

class App extends Component {
    render() {
        return h(Router, {},
                h(Home, { path: '/' }),
                h(Sketch, { path: '/sketch' }),
                h(Sketch, { path: '/sketch/:id' }),
                h(Embed, { path: '/embed' }),
                h(Embed, { path: '/embed/:id' }),
                h(Docs, { path: '/docs', page: 'index'}),
                h(Docs, { path: '/docs/:page'}),
                h(NotFound, { type: '404', default: true })
        );
    }
}

render(h(App), document.body);
