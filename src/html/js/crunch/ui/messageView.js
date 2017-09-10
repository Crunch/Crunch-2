define([
	'lib/lodash'
	, 'crunch/ui/baseView'
	, 'text!template/messages.html'
	, 'Ractive' ], function(_, base, template, Ractive) {
	
	var Path = require('path');

	var Messages = {
		ractive: null
		, messages: []
		, add: function(mObj) {
			
			try {
				if(!mObj.message && mObj.schema === "node" && mObj.obj && mObj.obj.stack) {
					mObj.message = mObj.obj.message + "<br>" + mObj.obj.stack.replace("\n", "<br>");
				}
				else if(!mObj.message && mObj.obj && mObj.obj.message) { 
					mObj.message = mObj.obj.message;
				}
				else if(!mObj.message) {
					mObj.message = JSON.stringify(mObj);
				}
			}
			catch(ex) {
				if(!mObj.message)
					mObj.message = "Undefined error."
			}

			var d = new Date();
			mObj.time = d.toLocaleTimeString();

			mObj.date = (d.getMonth() + 1) + '/' + (d.getDate());
            mObj['new'] = true;
			// Format message obj by schema

			//console.log(mObj);

			switch(mObj.type) {
				case 'error':
					mObj.icon = 'ico-exclamation-triangle';
					mObj.title = 'Whoops!';
					break;
				case 'warning':
					mObj.icon = 'ico-exclamation-circle';
					mObj.title = 'Head\'s up:';
					break;
				case 'crunch': 
					mObj.title = 'Crunched!';
					// intentionally fall through to set success icon 
				case 'success':
					mObj.icon = 'ico-checkmark';
					break;
				case 'info':
					mObj.icon = 'ico-asterisk';
					break;
				case 'loading':
				    mObj.icon = 'ico-spinner8';
				    break;
				// case 'temp':
				// 	mObj.icon = '';
				// 	break;
			}



			if(!this.ractive) {
				this.create(global.Crunch);
			}
			var mArray = [ mObj ];
			if(mObj.type === 'temp' && this.messages.length > 0 && (this.messages[0].type === 'loading' || this.messages[0].type === 'error')) {
				return;
			}
			this.messages.forEach(function(val, idx) {
				if(val.type !== 'loading' && val.type !== 'temp') {
					mArray.push(val);
				}
			});
			if(mArray.length > 100) { mArray.pop(); }
			this.messages = mArray;

			clearTimeout(this.timeout);
			var _this = this;
            this.ractive.set('messages.0.new', false).then(function() {
            	// Causes reflow and restart of animation
            	// https://css-tricks.com/restart-css-animation/
            	Messages.ractive.el.offsetWidth = Messages.ractive.el.offsetWidth;
            	Messages.ractive.set('messages', mArray);
            	
            });
		
			
            this.timeout = setTimeout(function() {
                Messages.ractive.set('messages.0.new', false);
            }, 6100);
			//Messages.all.push({ type: type, msg: msg });
		}
		, create: function(Crunch) {

			if(Messages.ractive) {
				Messages.ractive.update();
				return;
			}
			
			var ractive = new Ractive({
				el: document.getElementById('messageBar')
				, template: template
				, data: { 
					messages: []
					, basename: function(path) {
						return Path.basename(path);
					}
				}
			});


			this.$el = $(ractive.el);
			// {
			// 	type: 'error'
			// 	, engine: 'less'
			// 	, re: 'compile'
			// 	, message: 'We didn\'t understand the variable in <a>buttons.less</a> on <a>line 63</a>.'
			// }
			ractive.on({
				select: function(event) {
				
				}
				, open: function(event) {
					Messages.$el.toggleClass('open');
					Messages.$el.find('.top .message-item').removeClass('new');
				}
			});

			while(Messages._eventQueue.length > 0) {
				ractive.on(Messages._eventQueue.shift());
			}

			Messages.ractive = ractive;
			

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

	return _.extend(Messages, base());
});