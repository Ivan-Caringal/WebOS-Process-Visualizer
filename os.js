function runAlgorithm() {
    const algorithm = document.getElementById("algorithm").value;
    const numProcesses = parseInt(document.getElementById("numProcesses").value);
    const burstTimes = document.getElementById("burstTimes").value.split(" ").map(Number);
    const arrivalTimes = document.getElementById("arrivalTimes").value.split(" ").map(Number);
    const quantum = parseInt(document.getElementById("quantum").value);
    const ganttChart = document.getElementById("ganttChart");
    const processDetails = document.getElementById("processDetails");
    const metrics = document.getElementById("metrics");

    if (numProcesses > 7 || burstTimes.length !== numProcesses || arrivalTimes.length !== numProcesses) {
        alert("Invalid input. Please ensure all fields are filled correctly and number of processes does not exceed 7.");
        return;
    }

    let output;
    if (algorithm === "RR") {
        output = roundRobin(numProcesses, burstTimes, arrivalTimes, quantum);
    } else if (algorithm === "SRTF") {
        output = srtf(numProcesses, burstTimes, arrivalTimes);
    }

    // Append a note to the Gantt chart output
    output.gantt += `<br><p>Note: Add 1 in the MS</p>`;

    ganttChart.innerHTML = `<h3>Gantt Chart</h3><p>${output.gantt}</p>`;
    processDetails.innerHTML = `<h3>Process Details</h3><table>${output.details}</table>`;
    metrics.innerHTML = `<h3>Metrics</h3><p>${output.metrics}</p>`;
}

function roundRobin(numProcesses, burstTimes, arrivalTimes, quantum) {
    let remainingBurstTime = burstTimes.slice();
    let waitingTime = new Array(numProcesses).fill(0);
    let turnaroundTime = new Array(numProcesses).fill(0);
    let completionTime = new Array(numProcesses).fill(0);
    let time = 0;
    let completed = 0;
    let readyQueue = [];
    let ganttChart = [];
    let idleCount = 1;

    while (completed < numProcesses) {
        for (let i = 0; i < numProcesses; i++) {
            if (arrivalTimes[i] <= time && remainingBurstTime[i] > 0 && !readyQueue.includes(i)) {
                readyQueue.push(i);
            }
        }

        if (readyQueue.length === 0) {
            ganttChart.push(`IDLE${idleCount++} (${time++}ms)`);
            continue;
        }

        let current = readyQueue.shift();

        if (remainingBurstTime[current] > quantum) {
            for (let i = 0; i < quantum; i++) {
                ganttChart.push(`P${current + 1} (${time++}ms)`);
            }
            remainingBurstTime[current] -= quantum;
        } else {
            for (let i = 0; i < remainingBurstTime[current]; i++) {
                ganttChart.push(`P${current + 1} (${time++}ms)`);
            }
            remainingBurstTime[current] = 0;
            completed++;
            completionTime[current] = time;
            waitingTime[current] = time - burstTimes[current] - arrivalTimes[current];
            turnaroundTime[current] = time - arrivalTimes[current];
        }

        for (let i = 0; i < numProcesses; i++) {
            if (arrivalTimes[i] <= time && remainingBurstTime[i] > 0 && !readyQueue.includes(i) && i !== current) {
                readyQueue.push(i);
            }
        }

        if (remainingBurstTime[current] > 0) {
            readyQueue.push(current);
        }
    }

    let avgWaitingTime = (waitingTime.reduce((a, b) => a + b, 0) / numProcesses).toFixed(2);
    let avgTurnaroundTime = (turnaroundTime.reduce((a, b) => a + b, 0) / numProcesses).toFixed(2);
    let totalCompletionTime = Math.max(...completionTime) - Math.min(...arrivalTimes);
    let throughput = (numProcesses / totalCompletionTime).toFixed(2);
    let cpuEfficiency = ((burstTimes.reduce((a, b) => a + b, 0) / Math.max(...completionTime)) * 100).toFixed(2);

    return {
        gantt: ganttChart.join(" | "),
        details: `<tr><th>Processes</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Turnaround Time</th></tr>` + 
                 burstTimes.map((_, i) => `<tr><td>P${i+1}</td><td>${arrivalTimes[i]}</td><td>${burstTimes[i]}</td><td>${waitingTime[i]}</td><td>${turnaroundTime[i]}</td></tr>`).join(""),
        metrics: `Average Waiting Time: ${avgWaitingTime}<br>Average Turnaround Time: ${avgTurnaroundTime}<br>Throughput: ${throughput} processes/unit time<br>CPU Efficiency: ${cpuEfficiency}%`
    };
}

function srtf(numProcesses, burstTimes, arrivalTimes) {
    class Process {
        constructor(pid, bt, art) {
            this.pid = pid;
            this.bt = bt;
            this.art = art;
        }
    }

    let processes = [];
    for (let i = 0; i < numProcesses; i++) {
        processes.push(new Process(i + 1, burstTimes[i], arrivalTimes[i]));
    }

    let rt = burstTimes.slice();
    let wt = new Array(numProcesses).fill(0);
    let tat = new Array(numProcesses).fill(0);
    let complete = 0, t = 0, minm = Infinity, shortest = 0, check = false;
    let ganttChart = [], idleCount = 1;

    while (complete !== numProcesses) {
        for (let j = 0; j < numProcesses; j++) {
            if (processes[j].art <= t && rt[j] < minm && rt[j] > 0) {
                minm = rt[j];
                shortest = j;
                check = true;
            }
        }

        if (!check) {
            ganttChart.push(`IDLE${idleCount++} (${t++}ms)`);
            continue;
        }

        rt[shortest]--;

        ganttChart.push(`P${processes[shortest].pid} (${t}ms)`);

        minm = rt[shortest];
        if (minm === 0) minm = Infinity;

        if (rt[shortest] === 0) {
            complete++;
            check = false;

            let finish_time = t + 1;
            wt[shortest] = finish_time - processes[shortest].bt - processes[shortest].art;

            if (wt[shortest] < 0) wt[shortest] = 0;
        }

        t++;
    }

    for (let i = 0; i < numProcesses; i++) {
        tat[i] = processes[i].bt + wt[i];
    }

    let avgWaitingTime = (wt.reduce((a, b) => a + b, 0) / numProcesses).toFixed(2);
    let avgTurnaroundTime = (tat.reduce((a, b) => a + b, 0) / numProcesses).toFixed(2);
    let totalCompletionTime = t - Math.min(...arrivalTimes);
    let throughput = (numProcesses / totalCompletionTime).toFixed(2);
    let cpuEfficiency = ((burstTimes.reduce((a, b) => a + b, 0) / t) * 100).toFixed(2);

    return {
        gantt: ganttChart.join(" | "),
        details: `<tr><th>Processes</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Turnaround Time</th></tr>` + 
                 processes.map((p, i) => `<tr><td>P${p.pid}</td><td>${p.art}</td><td>${p.bt}</td><td>${wt[i]}</td><td>${tat[i]}</td></tr>`).join(""),
        metrics: `Average Waiting Time: ${avgWaitingTime}<br>Average Turnaround Time: ${avgTurnaroundTime}<br>Throughput: ${throughput} processes/unit time<br>CPU Efficiency: ${cpuEfficiency}%`
    };
}
