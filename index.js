import React, { Component, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Icon } from "native-base"
import { Dimensions, Keyboard, TouchableOpacity, TouchableHighlight, WebView, Animated, PanResponder, StyleSheet, Image, Platform } from 'react-native';
import moment from "moment"

const SCREEN_WIDTH = Dimensions.get("window").width
const SCREEN_HEIGHT = Dimensions.get("window").height
const INTERCOM_OPEN_WIDTH = SCREEN_WIDTH
const INTERCOM_OPEN_HEIGHT = SCREEN_HEIGHT
const INTERCOM_CLOSE_WIDTH = 50
const INTERCOM_CLOSE_HEIGHT = 50
const INTERCOM_IMG = require("./intercom.png")

const wrapperStyle = {
    width: INTERCOM_OPEN_WIDTH - 10,
    height: INTERCOM_OPEN_HEIGHT - 40,
    position: 'absolute',
    top: INTERCOM_OPEN_HEIGHT,
    right: 10,
}

const CloseIcon = ({onPress}) => (
    <TouchableHighlight onPress={onPress} style={styles.closeIcon}>
        <Icon name={"close"} type="FontAwesome" style={styles.crossIcon} />
    </TouchableHighlight>
)
const IntercomApp = ({
    appId, name, email, userId, style, uri,
    onMessage,
    onLoadEnd,
    onCloseIntercom
}) => {
    const webView = useRef();
    useEffect(
        () => {
            setTimeout(() => {
                if(webView && webView.current)
                    webView.current.reload()
            }, 1000)
            
        },
        [userId]
    )
    
    const injectedJS = (appId, name, email, userId = '') => {
        var timestamp = moment(Date.now());
        var unixTimestamp = timestamp.unix();

        const config = {
            user_id: userId,
            app_id: appId,
            created_at: unixTimestamp,
            name: name,
            email: email,
        }

        let strConfig = ''
        try {
            strConfig = JSON.stringify(config)
        } catch(e){
            console.log('Unable to stringify config', e)
        }
          
        return `            
            window.Intercom('shutdown');
            window.Intercom('boot', ${strConfig});            
            window.Intercom('show')
            window.Intercom('onShow', function(){
                window.postMessage("Intercom shown", "*");
            })
            window.Intercom('onHide', function(){
                window.postMessage("Intercom closed", "*");
                setTimeout( () => window.Intercom('show'), 400);
            })             
        `;
    }
    const navigationStateChangedHandler = ({url}) => {
        //console.log("url: ", url)
        //console.log("uri: ", uri)
        if (url.includes('https://intercom.com') && webView && webView.current) {
             alert("will refresh your message soon.. ")
             webView.current.goBack()
        }
      };
    return (
        <Animated.View style={[wrapperStyle, style]}>
            <CloseIcon onPress={onCloseIntercom} />
            <WebView 
                ref={webView}
                source={Platform.OS === "ios" ? require("./IntercomWebView.html") : {uri}}
                style={{flex: 1, width:"100%", backgroundColor: 'white'}}
                injectedJavaScript={injectedJS( appId, name, email, userId  )}
                javaScriptEnabled={true}
                onLoadEnd={onLoadEnd}
                useWebKit={true}
                bounces={false}
                automaticallyAdjustContentInsets={true}
                onNavigationStateChange={navigationStateChangedHandler}
                onMessage={onMessage}
                applicationNameForUserAgent={"KickAvenueApp"}
            
            />
        </Animated.View>
    )
}

class IntercomWebView extends Component{
    constructor(props){
        super(props);
        this.state = {
            isLoading: true,
            isIntercomOpen: new Animated.Value(0),
            keyboardY: 0,
            pan: new Animated.ValueXY()
        };
        this.onLoadEnd = this.onLoadEnd.bind(this);
    }

    componentWillMount(){
        this._panResponder = PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event([
                null,
                {
                    dx: this.state.pan.x,
                    dy: this.state.pan.y
                }
            ]),
            onPanResponderGrant: (e, gestureState) => {
                this.state.pan.setOffset({x: this.state.pan.x._value, y: this.state.pan.y._value});
                this.state.pan.setValue({x: 0, y: 0})
            },
            onPanResponderRelease: () => {
                this.state.pan.flattenOffset()      
           }
        })
    }

    componentDidMount = () => {
       this.keyboardListener()
    }

    componentWillUnmount(){
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    keyboardListener = () => {
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',(frames)=>{
            console.log("keyword will show")
            if (!frames.endCoordinates) return;
            this.setState({keyboardY: frames.endCoordinates.height});
        });
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',(frames)=>{
            console.log("keyword will hide")
            this.setState({keyboardY:0});
        });
    }


    onLoadEnd = () => {
        this.setState({isLoading: false});

        if (this.props.onLoadEnd)
            this.props.onLoadEnd();
    }

    onMessage = (e) => {
        const message = e.nativeEvent.data

        // if(message === "Intercom shown")
        // {
        //     this.openIntercom()
        // }      
        // if(message === "Intercom closed")
        // {
        //     this.closeIntercom()
        // }   
    }

    openIntercom = () => {
        Animated.spring(
            this.state.isIntercomOpen,
            { toValue: 1 },
            { useNativeDriver: true }
        ).start()
    }
    closeIntercom = () => {
        Animated.timing(
            this.state.isIntercomOpen,
            { toValue: 0 },
            { useNativeDriver: true }
        ).start()
    }

    render(){
        const { uri, appId, name, email, userId, ...remainingProps } = this.props;
        const { keyboardY } = this.state 

        const intercomStyle = { 
            transform: [{translateY: this.state.isIntercomOpen.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -SCREEN_HEIGHT]
            })}]
        }
        const iconStyle = { 
            transform: [{scale: this.state.isIntercomOpen.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0]
            })}, {
                rotate: this.state.isIntercomOpen.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-360deg']
                })
            }],
            opacity: this.state.isIntercomOpen.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1, 0]
            })
        }

 
        const keyboardStyle = { top: 0, height: SCREEN_HEIGHT-keyboardY}

        //const keyboardStyle = { top: 0, height: SCREEN_HEIGHT}
        
        return (
            <>
              <Animated.View style={[styles.intercomIconWrapper, iconStyle]}>
                <TouchableOpacity style={styles.intercomIcon} onPress={this.openIntercom}>
                    <Image source={INTERCOM_IMG} style={styles.icon} resizeMode={"contain"} />
                </TouchableOpacity>
              </Animated.View>
              
              <IntercomApp
                appId = {appId}
                name = {name} 
                email = {email} 
                userId = {userId} 
               
                onMessage={this.onMessage}
                onCloseIntercom = {this.closeIntercom}
                style={keyboardY? keyboardStyle: intercomStyle }
                //style={keyboardStyle}
                uri={uri}
                />
            </>
        )             
    }
}

const styles = StyleSheet.create({
    intercomIconWrapper: {
        position: 'absolute',
        bottom: 70,
        right: 20,
        //flex: 1,
        zIndex: 100,
    },
    intercomIcon: {
        width: INTERCOM_CLOSE_WIDTH,
        height: INTERCOM_CLOSE_HEIGHT,
        borderRadius: INTERCOM_CLOSE_WIDTH/2,
        backgroundColor: '#2c8535',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: "rgba(0, 0, 0, 0.36)",
        shadowOffset: {
        width: 0,
        height: 0
        }, 
        shadowOpacity: 1, 
        shadowRadius: 3,
    },
    closeIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#000",
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
    },
    icon: {
        width: 40,
        height: 40
    },
    crossIcon: {
        fontSize: 16,
        color: "#fff"
    }
})

IntercomWebView.propTypes = {
    appId: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    userId: PropTypes.string || null
};

IntercomWebView.defaultProps = {
    userId: null
};

export default IntercomWebView;
