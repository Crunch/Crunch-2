define([
	  'crunch/storage'
	, 'text!template/modal.html'
	, 'Ractive'
	, 'lodash'
	, 'jquery'], function(Storage, modalTemplate, Ractive, _, $) {
  // Create our Modal subclass
	var modalCount = 0;
	var $modals = $('#modals');
	
	function validateImmediately() {
		Storage.put('z', 1852);
		Crunch.Settings._validated = null;
		document.title = 'Crunch 2 Pro';
		$('#container').addClass('pro').removeClass('free');
	}

	var Modal = Ractive.extend({
		el: $modals[0]
		, append: true
		, template: modalTemplate
		, onrender: function () {
			var self = this, resizeHandler;

			this.outer = this.find( '.modal-outer' );
			this.modal = this.find( '.modal' );

			// if the user taps on the background, close the modal
			this.on( 'close', function ( event ) {
				if ( !this.modal.contains( event.original.target ) ) {
					this.fire('beginTeardown');
				}
			});

			// when the window resizes, keep the modal horizontally and vertically centred
			window.addEventListener( 'resize', resizeHandler = function () {
				self.center();
			}, false );

			// clean up after ourselves later
			this.on( 'beginTeardown', function() {
				modalCount--;
				if(modalCount === 0) {
					$modals.removeClass('modal-show');
				}
				//setTimeout(function() {
				
				if(self.id) {
					Modals.collection[self.id] = null;
				}
				self.teardown();
				
				//},500);
			});
			this.on( 'teardown', function () {
				window.removeEventListener( 'resize', resizeHandler );
			}, false );

			// manually call this.center() the first time
			this.center();
		}
		, oncomplete: function() {
			if(modalCount > 0) {
				$modals.addClass('modal-show');
			}
		}
		, center: function () {
			var outerHeight, modalHeight, verticalSpace;

			// horizontal centring is taken care of by CSS, but we need to
			// vertically centre
			// Probably could convert this to flexbox
			outerHeight = this.outer.clientHeight;
			modalHeight = this.modal.clientHeight;

			verticalSpace = ( outerHeight - modalHeight ) / 2;

			this.modal.style.top = verticalSpace + 'px';
		}
	});


	var Modals = {
		collection: {}
		, create: function(obj) {
			if(obj.id) {
				if(!Modals.collection[obj.id]) {
					modalCount++;
					Modals.collection[obj.id] = new Modal(obj);
					return Modals.collection[obj.id];
				}
			}
			else {
				modalCount++;
				return new Modal(obj);
			}
			
		}
		, open: function(options) {

			curl(['text!../' + options.template], function(modal) {
				
				var win = Modals.create({
				  data: options.data
				  , id: options.id
				  , partials: {
				    modalContent: modal
				  }
				});

				if(win) {
					
					if(!options.events || options.events && !options.events.cancel) {
						win.on( 'cancel', function () {
						  this.fire('beginTeardown');
						});
					}
					_.each(options.events, function(obj, key) {
						win.on(key, obj);
					});
					_.each(options.observers, function(obj, key) {
						win.observe(key, obj, {init:false});
					});
				}
			});	
		}
		, showActivationModal: function() {
			Crunch.ua.e('PurchaseFlow', 'ActivateOpen').send();
			Modals.open({ 
				template: 'win/activate.html'
				, data: {
					title: 'Activate Crunch 2 Pro'
					, activate: { email: '', cc: '' }
					, icon: true
					, primary: {
						label: "Activate!"
					}
					, secondary: {
						label: CRUNCH_FIRST_RUN ? 'Buy Pro!' : 'Cancel'
					}
					, tertiary: {
						label: CRUNCH_FIRST_RUN ? "Try Crunch Free" : ''
					}
				}
				, events: {
					tertiaryAction: function(e) {
						this.fire('beginTeardown');
					}
					, secondaryAction: function(e) {
						this.fire('beginTeardown');
						if(CRUNCH_FIRST_RUN) {
							Modals.openPurchase();
						}
					} 
					, primaryAction: function(e) {
						
						var modal = this;
						var request = require('request');

						request({
							url: 'https://getcrunch.co/validate/activate.php'
							, json: true
							, qs: modal.get('activate')
						}
						, function(error, response, data) {
							
							modal.fire('beginTeardown');

							if (error) {
								alert('Network error while activating.\n' + error);
								Crunch.ua.e('PurchaseFlow', 'NetError').send();
								return;
							}
							
							if(data.success) {
								validateImmediately();
								Crunch.ua.e('PurchaseFlow', 'ActivationSuccess').send();
								
								Modals.open({ 
									template: 'win/dialog.html'
									, data: {
										title: 'Activation Successful'
										, icon: true
										, text: "Crunch 2 has been activated and upgraded to Crunch 2 Pro. Enjoy!"
										, primary: {
											label: "Yay!"
										}
									}
									, events: {
										primaryAction: function(e) {
											this.fire('beginTeardown');
										}
									}
								});
							}
							else {
								Crunch.ua.e('PurchaseFlow', 'ActivationFail').send();
								console.log(data);
								Modals.open({ 
									template: 'win/dialog.html'
									, data: {
										title: 'Activation Unsuccessful'
										, icon: true
										, text: "Crunch 2 could not be activated. " + data.error + " :("
										, primary: {
											label: "Okay."
										}
									}
									, events: {
										primaryAction: function(e) {
											this.fire('beginTeardown');
										}
									}
								});
							}
								
							
						});

					}
				}
			});
		}
		, openPurchase: function() { 
			Crunch.ua.e('PurchaseFlow', 'Open').send();
			//var ModeList = ace.require("ace/ext/modelist");
			// var text = '<ul><li><strong>More compilers! </strong> Sass, CoffeeScript, TypeScript, HAML, and more...</li>\
			// 		<li style="width: 110%"><strong style="float: left">More code formats!&nbsp;</strong> ';

			// var arr = [];
			// var oldheight = -1;

			// _.each(ModeList.modes, function(val, i) {
			// 	var percent = Math.round(((ModeList.modes.length - i) / ModeList.modes.length) * 100 / 2) * 2;
			// 	var height = Math.round((percent / 100) * 24);
			// 	var clear = '';
			// 	if(height !== oldheight && oldheight !== -1) {
			// 		clear += ';clear: left';
			// 	}
			// 	oldheight = height;
			// 	arr.push(' style="font-size: ' + percent + '%; height: ' + height +'px' + clear + '">' + val.caption);
			// });
			// text += '<s' + arr.join(',&nbsp;</s><s') + '</s></li></ul>';

			var text = '<ul><li><strong>More compilers! </strong> Sass, Stylus, CoffeeScript, LiveScript, Pug (Jade), Markdown, and more!</li>\
					<li><strong>More code formats!&nbsp;</strong> Over 100 additional text modes!</li>\
					<li><strong>More features!</strong> Code hints and other features to arrive in Crunch 2 Pro soon (free upgrade for Pro users!) </li></ul>';

			Modals.open({
				template: 'win/dialog.html'
				, data: {
					title: 'Crunch 2 Pro gives you:'
					, icon: true
					, text: text
					, primary: {
						label: '<i class="ico-lock"></i> Buy Securely'
					}
					, secondary: {
						label: '<i class="ico-checkmark"></i> Activate'
						//, cssClass: 'primary'
					}
					, tertiary: {
						label: 'Cancel'
					}
				}
				, events: {
					tertiaryAction: function(e) {
						this.fire('beginTeardown');
					} 
					, primaryAction: function(e) {
						this.fire('beginTeardown');
						//alert('Crunch 2 Pro will be available for purchase soon...');
						//return;
						Crunch.ua.e('PurchaseFlow', 'Action:Buy').send();

						var $iframe = $('iframe');
						var win = $iframe[0].contentWindow;
						win['messageFromChild'] = messageFromChild;
						$iframe.css('display', 'block');


						function messageFromChild(msg) {
							console.log(msg);
							
							$iframe.css('display', 'none');
							win['messageFromChild'] = null;

							if(msg.close) {
								// Stripe was closed, refresh iframe
								$iframe.attr( 'src', function ( i, val ) { return val; });
								return;
							}

							if(msg.data) {
								
								if(msg.data.success) {

									validateImmediately();
									Crunch.ua.e('PurchaseFlow', 'PurchaseSuccess').send();

									Modals.open({ 
										template: 'win/dialog.html'
										, data: {
											title: 'Welcome to Pro!'
											, icon: true
											, text: "You've taken your first step into a larger world."
											, primary: {
												label: "I'm excited!"
											}
										}
										, events: {
											primaryAction: function(e) {
												this.fire('beginTeardown');
											}
										}
									});
								}
								else if (msg.data.exists) {
									Modals.open({ 
										template: 'win/dialog.html'
										, data: {
											title: 'Email already registered'
											, icon: true
											, text: "The purchase failed, because this email is already registered. Did you forget purchasing Crunch 2 Pro?"
											, primary: {
												label: "Try Activating!"
											}
											, secondary: {
												label: "Never mind."
											}
										}
										, events: {
											primaryAction: function(e) {
												this.fire('beginTeardown');
												Modals.showActivationModal();
											}
											, secondaryAction: function(e) {
												this.fire('beginTeardown');
											}
										}
									});
								}
								else {
									Crunch.ua.e('PurchaseFlow', 'PurchaseFail').send();
									Modals.open({ 
										template: 'win/dialog.html'
										, data: {
											title: 'Whoops!'
											, icon: 'ico-error'
											, text: "Some kind of problem happened. Does this help? <br><br>" + msg.data.error
											, primary: {
												label: "Yes?"
											}
										}
										, events: {
											primaryAction: function(e) {
												this.fire('beginTeardown');
											}
										}
									});
								}
							}
							else {
								alert('There was an error communicating with the server.');
								Crunch.ua.e('PurchaseFlow', 'NetError').send();
							}
						}
						
					}
					, secondaryAction: function(e) {
						Crunch.ua.e('PurchaseFlow', 'Action:Activate').send();
						this.fire('beginTeardown');
						Modals.showActivationModal();
					}
				}
				, observers: {
					
				}
				//, events
			});
		}
	}
  
  return Modals;
});