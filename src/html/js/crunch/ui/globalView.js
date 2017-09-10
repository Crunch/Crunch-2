define([
	'lib/lodash'
	, 'crunch/ui/baseView'
	, 'crunch/settings'
	, 'text!template/global.html'
	, 'Ractive'
	, 'js!lib/theme-crunch'
	, 'js!lib/theme-crunch-dark' ], function(_, base, Settings, template, Ractive) {
	
	var Path = require('path');

	var Global = {
		ractive: null
		, create: function(Crunch) {

			if(Global.ractive) {
				Global.ractive.update();
				return;
			}

			var ractive = new Ractive({
				el: document.getElementById('globalSettings')
				, template: template
				, data: { 
					settings: Settings._config
					, values: Settings.App.config
					, validated: Settings.v()
					, log: function(item) {
						console.log(item);
					}
				}
			});


			this.$el = $(ractive.el);
		
			ractive.on({
				select: function(event) {
				
				}
				, open: function(event) {
					if(Global.$el.hasClass('open')) {
						Global.$el.removeClass('open')
					}
					else {
						Global.$el.addClass('open')
						if(!Settings.v())
							Crunch.ua.e('GlobalSettings', 'Open').send();
					}
					//Global.$el.toggleClass('open');
				}
			});
			
			ractive.observe('*',  function ( newValue, oldValue, keypath ) {
				Crunch.ua.e('GlobalSettings', 'Change').send();
				
				var editor = Crunch.App.editor;
				var session = editor.getSession();
				Settings.App.config.editor.softTabs = !!Settings.App.config.editor.softTabs;
				Settings.App.config.editor.tabSize = Settings.App.config.editor.tabSize || 1;

				try {
					session.setUseSoftTabs(Settings.App.config.editor.softTabs);
					session.setTabSize(Settings.App.config.editor.tabSize);
				}
				catch(ex) {}

				if(keypath.indexOf('theme') > -1) {
					if(Settings.App.config.theme === 1 || Settings.App.config.theme === "1") {
						editor.setTheme("ace/theme/crunch-dark");
						$('html').addClass('dark');
					}
					else {
						editor.setTheme("ace/theme/crunch");
						$('html').removeClass('dark');
					}
				}
				Settings.save('global');

			}, {init: false})

			while(Global._eventQueue.length > 0) {
				ractive.on(Global._eventQueue.shift());
			}

			Global.ractive = ractive;
			

		}
		, update: function() {
			if(!this.ractive) {
				this.create(global.Crunch);
			}
			else {
				this.ractive.update();
			}
		}
	};

	return _.extend(Global, base());
});