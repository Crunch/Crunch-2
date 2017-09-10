define(['crunch/ui/modals', 'crunch/settings', 'lib/sweetalert'], function(Modals, Settings, sweet) {

	var gui = window.require('nw.gui');
	var request = require('request');
	var semver = require('semver');
	var platform = require('./html/' + global.__jsdirname + '/utils/platform');
	
	var updater = {
		/**
		 * Check if there's a new version available.
		 */
		check: function(manifest, callback, alertNothing) {
			request(manifest.manifestUrl, function(error, response, body) {
				if (error) {
					return callback(alertNothing, error);
				}

				var newManifest = JSON.parse(body);
				var newVersionExists;
				var edge = Settings.App.config.updates == "0";
				//console.log(edge, newManifest);

				if(edge) {
					newVersionExists = semver.gt(newManifest.edge.version, manifest.version);
					newManifest = newManifest.edge;
				}
				else {
					newVersionExists = semver.gt(newManifest.version, manifest.version);
				}
				if(callback) {
					callback(alertNothing, error, newVersionExists, newManifest);
				}
				
			});
		},

		/**
		 * Show a dialog to ask the user to update.
		 */
		prompt: function(alertNothing, error, newVersionExists, newManifest) {
			//console.log(alertNothing);

			function showActivationPrompt(updateMessage) {
				Modals.open({
					template: 'win/dialog.html'
					, data: {
						title: 'New Crunch!'
						, text: updateMessage
						, icon: true
						, primary: {
							label: 'Yes, please!'
						}
						, secondary: {
							label: 'Not now'
						}
					} 
					, events: {
						primaryAction: function() {
							gui.Shell.openExternal(newManifest.packages[platform.name]);
							this.fire('beginTeardown');
						}
						, secondaryAction: function() {
							this.fire('beginTeardown');
						}
					}
				});
			}
			if (error && alertNothing) {
				Modals.open({
					template: 'win/dialog.html'
					, data: {
						text: 'There was a bit of a problem while trying to check for an update.'
						, title: 'Oops!'
						, icon: true
						, primary: {
							label: 'That\'s okay.'
						}
					}
					, events: {
						primaryAction: function() {
							this.fire('beginTeardown');
						}
					}
				});
			}
			else {

				if (newVersionExists) {
					var updateMessage = 'There\'s a new version available (' + newManifest.version + '). Would you like to download the update now?';

					var options = {
					  url: 'https://api.github.com/repos/Crunch/Crunch-2/releases/tags/v' + newManifest.version,
					  headers: {
					    'User-Agent': 'request'
					  }
					};
					request(options, function(error, response, body) {
						if (!error) {
							var msg;
							try {
								msg = JSON.parse(body);
								var accord = require('accord');
								var engine = accord.load('marked');
								
								engine.render(msg.body).then(function(res) {
									showActivationPrompt(updateMessage += 
										'<div class="release-notes">' + res.result + '</div>');
								}, function(err) {
									console.log('Couldn\'t parse release notes.')
									showActivationPrompt(updateMessage);
								});
							}
							catch(ex) {
								console.log(ex);
								showActivationPrompt(updateMessage);
							}
						}
						else {
							console.log(error, response);
							showActivationPrompt(updateMessage);
						}

						
					});

				}
				else if(alertNothing) {
					Modals.open({
						template: 'win/dialog.html'
						, data: {
							text: 'You\'ve got the newest and best Crunch of all time.'
							, title: 'Up-to-date'
							, icon: true
							, primary: {
								label: 'Awesome.'
							}
						}
						, events: {
							primaryAction: function() {
								this.fire('beginTeardown');
							}
						}
					});
				}
			}
		},

		/**
		 * Check for update and ask the user to update.
		 */
		checkAndPrompt: function(manifest, alertNothing) {
			this.check(manifest, this.prompt, alertNothing);
		}
	};

	return updater;
});


