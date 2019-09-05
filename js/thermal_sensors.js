
// Variables
var p_vi = [];  // List of chanels
var nb_ch = 6;  // nb of active chanels
var logging;    // boolean to enable data saving
var data = []   // List of datasets
var traces = [] // List of traces for the plots
var time_unit = "sec"   // units of the plot
var pp = 0;

// Calibration coefficients for each chanel
var a_calib = [222.2, 222.2, 222.2, 222.2, 222.2, 222.2];
var b_calib = [-59.626, -58.928, -58.309, -60.162, -59.917, -59.536];

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


    // Define the filename
    var dd = new Date()
    var fname = dd.toISOString().substr(0, 10)+"_T"+dd.toLocaleTimeString()+"_thermal_sensors"
    $('#fname').val(fname);
    document.getElementById("saveLOG").disabled = true;        
    });




function vi_onAttach(ch) {
    console.log(ch + ' attached');
    // console.log(ch + ch.id +' attached');
    // // var deviceSerialNumber = ch.getDeviceSerialNumber()
    // console.log(ch.id)
    // // ch.setDataInterval(8);
    // // ch.setVoltageChangeTrigger(0.01);
    ch.setDataInterval(parseInt($('#di').val())*1000);
    ch.setVoltageRatioChangeTrigger(0);
    
}

function setDI() {
    console.log("Set the data interval")
    // Set the data interval
	var di = parseInt($('#di').val())*1000; // convert seconds to milliseconds
	if (di === NaN)
        return (false);
        
    // the data interval is set for all the sensors at once (the minimun is 2 seconds)
	if (di < 1000) {
        // di = p_vi[0].getMinDataInterval();
        di = 1000;
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
    var data = []
    for(i=0; i<nb_ch;i++){
        data.push([])
    }
    return (data);
}

function vi_voltageChange(voltageRatio) {
    // We can access the sender of this event by using the "this" keyword. This lets us know which channel was triggered.
    // var ch = this.channel.index;
    var ch = this.channel.userphid._hubPort;
    // console.log(this.channel.userphid._hubPort)
    // console.log(voltage)
    // console.log(ch)

    // Update the display in the Voltage Inputs fields
    $('#vi_voltage_' + ch).val(voltageRatio);

    // Calculate the corresponding temperature given the calibration data
    let degC = voltageRatio*a_calib[ch] + b_calib[ch]

    // Update the display in the Temperature Inputs fields
    $('#vi_temp_' + ch).val(degC.toPrecision(4));

    // console.log("length "+ch+": "+data[ch].length)

    // Store the data and update the graph
    if (logging == 1){

        // Definition of a threshold length for the data
        // if the nb of rows reach that value, we force the download of the data
        // and we remove part of the dataset
        if (data[ch].length >2000){
            console.log(pp)
            console.log($('#fname').val()+"_part_"+pp)
            downloadCSV(data,$('#fname').val()+"_part_"+pp);
            pp++;
            clearLOG();
        }

        // Store the current step in the dataset
        current_time =  new Date().getTime()
		if (data[ch].length === 0){
			tstep = 0
		} else{
			tstep = (current_time - data[ch][0].timeStamp)/1000
        }
        data[ch].push(
            {                
                "timeStamp": current_time,
                "timeStep": tstep,
                "voltageRatio": voltageRatio,                
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
        // console.log(traces)                          
        var l0 = {
            xaxis:{title:{text: "Time ["+time_unit+"]"}},
            yaxis:{title:{text: "Temperature [degC]"}}
        }        
        Plotly.react("plot", traces, l0) 
    }
    // console.log(data)
}


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
    // disable the saveLOG button (will be active only when stopped)
    document.getElementById("saveLOG").disabled = true;
    pp = 0;
}

function stopLOG(){
    console.log("stop logging")    
    logging = 0;
    document.getElementById("saveLOG").disabled = false;
}

function clearLOG(){
    console.log("Clear data")
    data = resetData();
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

function saveLOG(){

    downloadCSV(data,$('#fname').val())

}

function convertArrayOfObjectsToCSV_2D(data){ //args) {  
    var result, ctr, keys, columnDelimiter, lineDelimiter //, data;
	if (data == null || !data.length) {
		return null;
	}    

    // Define the max nb of rows
    var nb_rows = data.map(d => d.length)
    var max_nb_rows = Math.max(...nb_rows)
    // console.log(nb_rows)    
	columnDelimiter = ', ';
    lineDelimiter = '\n';
    
    // Set the first line --> the keys of each array annotated with the chanel nb
    result = '';
    ctr = 0;
    for(i=0;i<nb_ch;i++){
        if (ctr > 0) result +=columnDelimiter;
        kk = Object.keys(data[i][0]).map(k => k+"_"+i);
        result += kk.join(columnDelimiter);
        ctr++; 
    }
    result += lineDelimiter;  
    
    // Add the rows
    keys = Object.keys(data[0][0])
    for(r=0;r<max_nb_rows;r++){
        ctr = 0;
        for(i=0;i<nb_ch;i++){
            keys.forEach(function(key){
                if (ctr > 0) result +=columnDelimiter;
                try{
                    result += data[i][r][key];
                    console.log(data[i][r][key])
                }
                catch(err){
                    console.log(err.message)
                    result += NaN
                }
                ctr++;
            })
        }
        result += lineDelimiter;
    }
    // console.log(result)
    return result;    
}


function downloadCSV(data, filename) {
    console.log("Download_csv")
	// var data, filename, link;
	var link;
    // var csv = convertArrayOfObjectsToCSV(data[0]);
	var csv = convertArrayOfObjectsToCSV_2D(data);    
	if (csv == null) return;

	// filename = args.filename || 'export.csv';

	if (!csv.match(/^data:text\/csv/i)) {
		csv = 'data:text/csv;charset=utf-8,' + csv;
	}
	data = encodeURI(csv);

	link = document.createElement('a');
	link.setAttribute('href', data);
	link.setAttribute('download', filename+".csv");
	link.click();
}