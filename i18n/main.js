const BASEURL = "https://raw.githubusercontent.com/knadh/listmonk/master/i18n/";
const BASELANG = "en";

var app = new Vue({
	el: "#app",
	data: {
		base: {},
		keys: [],
		visibleKeys: {},
		values: {},
		view: "all",
		loadLang: BASELANG,

		isRawVisible: false,
		rawData: "{}"
	},

	methods: {
		init() {
			document.querySelector("#app").style.display = 'block';
			document.querySelector("#loading").remove();
		},

		loadBaseLang(url) {
			return fetch(url).then(response => response.json()).then(data => {
					// Retain the base values.
					Object.assign(this.base, data);

					// Get the sorted keys from the language map.
					const keys = [];
					const visibleKeys = {};
					let head = null;
					Object.entries(this.base).sort((a, b) => a[0].localeCompare(b[0])).forEach((v) => {
						const h = v[0].split('.')[0];
						keys.push({
							"key": v[0],
							"head": (head !== h ? h : null) // eg: campaigns on `campaigns.something.else`
						});

						visibleKeys[v[0]] = true;
						head = h;
					});

					this.keys = keys;
					this.visibleKeys = visibleKeys;
					this.values = { ...this.base };

					// Is there cached localStorage data?
					if(localStorage.data) {
						try {
							this.loadData(JSON.parse(localStorage.data));
						} catch(e) {
							console.log("Bad JSON in localStorage: " + e.toString());
						}
						return;
					}
			});
		},

		loadData(data) {
			// Filter out all keys from data except for the base ones
			// in the base language.
			const vals = this.keys.reduce((a, key) => {
				a[key.key] = data.hasOwnProperty(key.key) ? data[key.key] : this.base[key.key];
				return a;
			}, {});

			this.values = vals;
			this.saveData();
		},

		saveData() {
			localStorage.data = JSON.stringify(this.values);
		},

		// Has a key been translated (changed from the base)?
		isDone(key) {
			return this.values[key] && this.base[key] !== this.values[key];
		},

		isItemVisible(key) {
			return this.visibleKeys[key];
		},

		onToggleRaw() {
			if (!this.isRawVisible) {
				this.rawData = JSON.stringify(this.values, Object.keys(this.values).sort(), 2);
			} else {
				try {
					this.loadData(JSON.parse(this.rawData));
				} catch (e) {
					alert("error parsing JSON: " + e.toString());
					return false;
				}
			}

			this.isRawVisible = !this.isRawVisible;
		},

		onLoadLanguage() {
			if(!confirm("Loading this language will overwrite your local changes. Continue?")) {
				return false;
			}

			fetch(BASEURL + this.loadLang + ".json").then(response => response.json()).then(data => {
				this.loadData(data);
			}).catch((e) => {
					console.log(e);
					alert("error fetching file: " + e.toString());
			});
		}
	},

	mounted() {
		this.loadBaseLang(BASEURL + BASELANG + ".json").then(() => this.init());
	},

	watch: {
		view(v) {
			// When the view changes, create a copy of the items to be filtered
			// by and filter the view based on that. Otherwise, the moment the value
			// in the input changes, the list re-renders making items disappear.

			const visibleKeys = {};
			this.keys.forEach((k) => {
				let visible = true;

				if (v === "pending") {
					visible = !this.isDone(k.key);
				} else if (v === "complete") {
						visible = this.isDone(k.key);
				}

				if(visible) {
					visibleKeys[k.key] = true;
				}
			});

			this.visibleKeys = visibleKeys;
		}
	},

	computed: {
		completed() {
			let n = 0;

			this.keys.forEach(k => {
				if(this.values[k.key] !== this.base[k.key]) {
					n++;
				}
			});

			return n;
		}
	}
});
