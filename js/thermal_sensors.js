
// Variables
var p_vi = [];  // List of chanels
var nb_ch = 2;  // nb of active chanels
var logging;    // boolean to enable data saving
var data = []   // List of datasets
var traces = [] // List of traces for the plots
var time_unit = "sec"   // units of the plot

// Calibration coefficients for each chanel
var a_calib = [222.2, 222.2];
var b_calib = [-61.111, -61.111];

// Establish the connection
$(document).ready(function() {
        var conn = new phidget22.Connection(8989, 'localhost');
        console.log(conn)

        // Create the chanels
        for(i=0;i<nb_ch;i++)
        {
            // p_vi.push(new phidget22.VoltageInput());
            p_vi.push(new phidget22.VoltageRatioInput());
            // Initialize the datasets for each chanel
            data.push([])
            traces.push([])
        }

        // Attach the handler and define the properties
        for(i=0;i<nb_ch;i++)
        {
            p_vi[i].onAttach = vi_onAttach;
            p_vi[i].onError = onError;
            p_vi[i].onVoltageRatioChange = vi_voltageChange;
            p_vi[i].setDeviceSerialNumber(559137);
            p_vi[i].setIsHubPortDevice(true);
            p_vi[i].setHubPort(i)
            p_vi[i].setChannel(0)    
        }

        // Connect the hub and the chanels
        conn.connect().then(function() {
			console.log('connected');
            for(i=0;i<nb_ch;i++)
            {
                console.log(i)
                // Once we're connected, try to open all eight of each type of channel:
                p_vi[i].open().then(function (){
                    console.log("Chanel open")
                }).catch(function(err) {
                    console.log('Failed to open Voltage Input Channel. Err: ' + err);
                });
            }
		}).catch(function(err) {
			alert('failed to connect to server:' + err);
        });;
        console.log(p_vi)
    });

function vi_onAttach(ch) {
    console.log(ch + ' attached');
    // console.log(ch + ch.id +' attached');
    // // var deviceSerialNumber = ch.getDeviceSerialNumber()
    // console.log(ch.id)
    // // ch.setDataInterval(8);
    // // ch.setVoltageChangeTrigger(0.01);
    ch.setDataInterval(2000);
    ch.setVoltageRatioChangeTrigger(0);
    
}

function setDI() {
    // Set the data interval
	var di = parseInt($('#di').val())*1000; // convert seconds to milliseconds
	if (di === NaN)
        return (false);
        
    // the data interval is set for all the sensors at once (the minimun is 2 seconds)
	if (di < 2000) {
		di = p_vi[0].getMinDataInterval();
		$('#di').val(di/1000);
	}    
	if (di > p_vi[0].getMaxDataInterval()) {
		di = p_vi[0].getMaxDataInterval();
		$('#di').val(di/1000);
    }
    
    for(i=0;i<nb_ch;i++){
        p_vi[i].setDataInterval(di)
    }
	return (false);
}

function resetData(data){
    data = []
    for(i=0; i<nb_ch;i++){
        data.push([])
    }
    console.log(data)
    // return (data);
}

function vi_voltageChange(voltage) {

    // We can access the sender of this event by using the "this" keyword. This lets us know which channel was triggered.
    // var ch = this.channel.index;
    var ch = this.channel.userphid._hubPort;
    // console.log(this.channel.userphid._hubPort)
    // console.log(voltage)
    console.log(ch)

    // Update the display in the Voltage Inputs fields
    $('#vi_voltage_' + ch).val(voltage);

    // Calculate the corresponding temperature given the calibration data
    let degC = voltage*a_calib[ch] + b_calib[ch]

    // Update the display in the Temperature Inputs fields
    $('#vi_temp_' + ch).val(degC.toPrecision(4));

    // Store the data and update the graph
    if (logging == 1){
        // Store the current step in the dataset
        current_time =  new Date().getTime()
		if (data[ch].length === 0){
			tstep = 0
		} else{
			tstep = (current_time - data[ch][0].timeStamp)/1000
        }
        data[ch].push(
            {
                "voltage": voltage,
                "timeStamp": current_time,
                "timeStep": tstep,
                "degC": +degC.toPrecision(4)
            })

        traces[ch] = {
                x: data[ch].map(function(d){
                    switch(time_unit){
                        case "sec":
                            dt = d.timeStep;
                            break;
                        case "min":
                            dt = d.timeStep/60;
                            break;
                        case "hours":
                            dt = d.timeStep/3600
                            break;
                    }
                    return dt
                }),
                y: data[ch].map(d => d.degC),
                name: "Channel "+ ch
            }
        console.log(traces)
        // var trace0 = {
        //     x: data[0].map(function(d){
        //         switch(time_unit){
        //             case "sec":
        //                 dt = d.timeStep;
        //                 break;
        //             case "min":
        //                 dt = d.timeStep/60;
        //                 break;
        //             case "hours":
        //                 dt = d.timeStep/3600
        //                 break;
        //         }
        //         return dt
        //     }),
        //     y: data[0].map(d => d.degC),
        //     name: "Chanel 0"           
        // }
        // var trace1 = {
        //     x: data[1].map(d => d.timeStep),
        //     y: data[1].map(d => d.degC),
        //     name: "Chanel 1"
        // }                              
        var l0 = {
            xaxis:{title:{text: "Time [sec]"}},
            yaxis:{title:{text: "Temperature [degC]"}}
        }
        // Plotly.react("plot", [trace0, trace1], l0) 
        Plotly.react("plot", traces, l0) 
    }
    console.log(data)
}

// function onError(arg0, arg1) {

//     var d = new Date();
//     $('#errorTable').append('<tr><td> ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + '</td><td> 0x' + arg0.toString(16) + '</td><td>' + arg1 + '</td>');
//     $("#errorField").show();
// }

function onError(arg0, arg1) {
    console.log("arg0 "+arg0)
    console.log("arg1 "+arg1)
    var d = new Date();
    $('#errorTable').append('<tr><td> ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + '</td><td> 0x' + arg0.toString(16) + '</td><td>' + arg1 + '</td>');
    $("#errorField").show();
}

function setLabel(name, value) {

    $('#' + name).text(value);    
}

function unitChange(){
    console.log($('#unit').val())
    time_unit = $('#unit').val()
}

function startLOG(){
    console.log("start logging")
    logging = 1;
}

function stopLOG(){
    console.log("stop logging")
    logging = 0;
}

function clearLOG(){
    console.log("Clear data")
    data = [[],[]];
    clearPlot();
}

function clearPlot(){
    // Initialize the plot
    var d0 = {x: [],
        y: [],
      type: "line"}
    var l0 = {
        xaxis:{title:{text: "Time [sec]"}},
        yaxis:{title:{text: "Values"}}
    }
    Plotly.newPlot("plot", [d0], l0);
}