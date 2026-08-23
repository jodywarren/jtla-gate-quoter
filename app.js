function saveCurrentJob() {
  const jobs = getSavedJobsRaw();
  const snapshot = deepClone(job);

  snapshot.savedAt = new Date().toISOString();

  const index = jobs.findIndex(
    (j) =>
      j.id === snapshot.id ||
      j?.client?.projectNumber === snapshot.client.projectNumber
  );

  if (index >= 0) {
    jobs[index] = snapshot;
  } else {
    jobs.push(snapshot);
  }

  localStorage.setItem(
    CFG.storage.savedJobsKey,
    JSON.stringify(jobs)
  );

  toast('Job saved');
  renderSavedJobs();
}


function renderSavedJobs() {
  const root = $('#saved-jobs-list');

  const jobs = getSavedJobsRaw().sort(
    (a, b) =>
      String(
        b.updatedAt ||
        b.savedAt
      ).localeCompare(
        String(
          a.updatedAt ||
          a.savedAt
        )
      )
  );

  if (!jobs.length) {
    root.innerHTML =
      '<div class="empty-state large">No saved jobs yet.</div>';

    return;
  }

  root.innerHTML = jobs
    .map(
      (savedJob) => `
        <div class="saved-job-card">

          <div class="saved-job-info">

            <div class="saved-job-name">
              ${safe(savedJob.client?.projectNumber || '')}
              ·
              ${safe(savedJob.client?.name || 'Unnamed client')}
            </div>

            <div class="saved-job-meta">
              ${safe(savedJob.client?.address || 'No address')}
              ·
              ${safe(savedJob.client?.mobile || '')}
            </div>

          </div>


          <div class="saved-job-actions">

            <button
              type="button"
              data-action="open-saved-job"
              data-job-id="${safe(savedJob.id)}"
            >
              Open
            </button>

            <button
              type="button"
              class="delete"
              data-action="delete-saved-job"
              data-job-id="${safe(savedJob.id)}"
            >
              Delete
            </button>

          </div>

        </div>
      `
    )
    .join('');
}


function openSavedJob(jobId) {
  const jobs = getSavedJobsRaw();

  const found = jobs.find(
    (j) =>
      j.id === jobId
  );

  if (!found) {
    return;
  }

  job = hydrateJob(found);
  undoStack = [];

  autosave();
  renderAll();

  toast('Saved job opened');
}


function deleteSavedJob(jobId) {
  const jobs = getSavedJobsRaw().filter(
    (j) =>
      j.id !== jobId
  );

  localStorage.setItem(
    CFG.storage.savedJobsKey,
    JSON.stringify(jobs)
  );

  renderSavedJobs();

  toast('Saved job deleted');
}


function startNewJob() {
  pushUndo();

  job = createNewJob();

  autosave();
  renderAll();

  toast('New job created');
}


function toast(message) {
  const el = $('#toast');

  if (!el) {
    return;
  }

  el.textContent = message;

  el.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () =>
      el.classList.remove('show'),
    1800
  );
}


function confirmAction(
  title,
  message,
  action
) {
  const dialog = $('#confirm-dialog');

  if (!dialog?.showModal) {
    if (window.confirm(message)) {
      action();
    }

    return;
  }

  $('#confirm-dialog-title').textContent =
    title;

  $('#confirm-dialog-message').textContent =
    message;

  dialogAction = action;

  dialog.showModal();
}


async function copyText(
  text,
  successMessage
) {
  try {
    await navigator.clipboard.writeText(text);

    toast(successMessage);
  } catch {
    const area =
      document.createElement('textarea');

    area.value = text;

    document.body.appendChild(area);

    area.select();

    document.execCommand('copy');

    area.remove();

    toast(successMessage);
  }
}


function inferValue(el) {
  if (el.type === 'number') {
    return (
      el.value === ''
        ? 0
        : Number(el.value)
    );
  }

  if (el.type === 'checkbox') {
    return el.checked;
  }

  if (
    el.dataset.claddingNested ===
    'custom.priceIncludesGST'
  ) {
    return (
      el.value === 'true'
    );
  }

  return el.value;
}


function isPricingPath(path) {
  return [
    'site.cavityWidthMm',
    'site.finishedHeightMm',
    'site.oneWayTravelKm',
    'labour.additionalFabricationHours',
    'labour.additionalInstallHours',
    'cladding.',
    'powder.'
  ].some(
    (prefix) =>
      path === prefix ||
      path.startsWith(prefix)
  );
}


function handleStateInput(el) {
  const path =
    el.dataset.statePath;

  if (!path) {
    return false;
  }

  let value =
    inferValue(el);

  if (
    path === 'client.name' ||
    path === 'client.address'
  ) {
    value =
      titleCase(value);
  }


  if (
    path === 'client.mobile'
  ) {
    let digits =
      String(value)
        .replace(/\D/g, '')
        .slice(
          0,
          CFG.clientFields.mobile.maxDigits
        );

    if (
      !digits.startsWith('04')
    ) {
      digits =
        `04${digits.replace(/^0*/, '')}`
          .slice(0, 10);
    }

    value = digits;
    el.value = digits;
  }


  if (
    path ===
    'client.projectNumber'
  ) {
    value =
      formatProjectNumber(
        parseProjectNumber(value)
      );

    el.value =
      value;
  }


  if (
    path ===
    'cladding.type'
  ) {
    mutate(
      () => {
        job.cladding.type =
          value;

        job.cladding.colour =
          '';

        job.cladding.finish =
          '';

        job.cladding.profile =
          '';

        job.cladding.palingLengthMm =
          '';

        job.cladding.palingWidthMm =
          '';

        job.cladding.accessoryLengthMode =
          'auto';

        job.cladding.accessoryLengthM =
          0;

        job.cladding.capping =
          true;

        job.cladding.plinth =
          true;

        job.cladding.custom = {
          name: '',
          costingMode: 'total',
          totalCost: 0,
          quantity: 1,
          unitCost: 0,
          priceIncludesGST: true,
          labourRatePerM2: 0
        };

        job.cladding.colorbond = {
          labourRatePerM2: 0
        };
      },
      {
        pricing: true
      }
    );

    return true;
  }


  mutate(
    () =>
      setPath(
        job,
        path,
        value
      ),
    {
      pricing:
        isPricingPath(path)
    }
  );

  return true;
}


function handleComponentField(el) {
  const id =
    el.dataset.componentId;

  const field =
    el.dataset.componentField;

  if (
    !id ||
    !field
  ) {
    return false;
  }

  const c =
    job.components.find(
      (x) =>
        x.id === id
    );

  if (!c) {
    return true;
  }

  const numericFields = [
    'manualFinishedHeightMm',
    'manualWidthMm',
    'internalRailCount',
    'widthMm',
    'verticalRailCount'
  ];

  const value =
    numericFields.includes(field)
      ? num(el.value)
      : el.value;


  mutate(
    () => {
      const oldPairId =
        c.doublePairId;

      c[field] =
        value;


      /*
        RETURN DOUBLE GATE TO SINGLE
      */

      if (
        field ===
          'relationship' &&
        value ===
          'single'
      ) {
        if (oldPairId) {
          job.components.forEach(
            (other) => {
              if (
                other.type ===
                  'gate' &&
                other.id !==
                  c.id &&
                other.relationship ===
                  'double' &&
                other.doublePairId ===
                  oldPairId
              ) {
                other.relationship =
                  'single';

                other.doublePairId =
                  '';
              }
            }
          );
        }

        c.doublePairId =
          '';
      }


      /*
        CREATE AUTOMATIC SECOND LEAF
        FOR DOUBLE GATE
      */

      if (
        field ===
          'relationship' &&
        value ===
          'double'
      ) {
        if (
          !c.doublePairId
        ) {
          c.doublePairId =
            `Pair ${Date.now()
              .toString()
              .slice(-4)}`;
        }


        const pairMembers =
          job.components.filter(
            (other) =>
              other.type ===
                'gate' &&
              other.id !==
                c.id &&
              other.relationship ===
                'double' &&
              other.doublePairId ===
                c.doublePairId
          );


        if (
          !pairMembers.length
        ) {
          const partner =
            newGate();

          partner.relationship =
            'double';

          partner.doublePairId =
            c.doublePairId;

          partner.frameType =
            c.frameType;

          partner.openDirection =
            c.openDirection;

          partner.widthMode =
            c.widthMode;

          partner.manualWidthMm =
            c.manualWidthMm;

          partner.internalRailCount =
            c.internalRailCount;

          partner.latchType =
            c.latchType;

          partner.hingeSide =
            c.hingeSide === 'left'
              ? 'right'
              : 'left';


          const index =
            job.components.findIndex(
              (x) =>
                x.id === c.id
            );


          job.components.splice(
            index + 1,
            0,
            partner
          );
        }
      }
    },
    {
      pricing: true
    }
  );


  return true;
}


function handlePanelPostField(el) {
  const id =
    el.dataset.componentId;

  const side =
    el.dataset.panelSide;

  const field =
    el.dataset.panelPostField;

  if (
    !id ||
    !side ||
    !field
  ) {
    return false;
  }


  const panel =
    job.components.find(
      (x) =>
        x.id === id &&
        x.type ===
          'fixedPanel'
    );


  if (!panel) {
    return true;
  }


  const p =
    side === 'left'
      ? panel.leftPost
      : panel.rightPost;


  const value =
    field ===
    'manualFinishedHeightMm'
      ? num(el.value)
      : el.value;


  mutate(
    () => {
      p[field] =
        value;
    },
    {
      pricing: true
    }
  );


  return true;
}


function handleCladdingField(el) {
  if (
    el.dataset.claddingField
  ) {
    const field =
      el.dataset.claddingField;


    const numeric = [
      'gapMm',
      'palingLengthMm',
      'palingWidthMm',
      'accessoryLengthM'
    ];


    const value =
      numeric.includes(field)
        ? (
            el.value === ''
              ? ''
              : num(el.value)
          )
        : el.value;


    mutate(
      () => {
        job.cladding[field] =
          value;
      },
      {
        pricing: true
      }
    );


    return true;
  }


  if (
    el.dataset.claddingNested
  ) {
    const path =
      `cladding.${el.dataset.claddingNested}`;


    let value =
      inferValue(el);


    if (
      [
        'custom.totalCost',
        'custom.quantity',
        'custom.unitCost',
        'custom.labourRatePerM2',
        'colorbond.labourRatePerM2'
      ].some(
        (x) =>
          el.dataset.claddingNested ===
          x
      )
    ) {
      value =
        num(el.value);
    }


    setPath(
      job,
      path,
      value
    );


    markPricingChanged();


    job.updatedAt =
      new Date().toISOString();


    autosave();
    renderAll();


    return true;
  }


  return false;
}


/* =========================================================
   CHANGE EVENTS
   ========================================================= */

document.addEventListener(
  'change',
  (event) => {
    const el =
      event.target;


    if (
      !(
        el instanceof HTMLElement
      )
    ) {
      return;
    }


    /*
      DOUBLE PAIR
    */

    if (
      el.dataset.actionChange ===
      'set-double-pair'
    ) {
      const c =
        job.components.find(
          (x) =>
            x.id ===
              el.dataset.componentId &&
            x.type ===
              'gate'
        );


      if (!c) {
        return;
      }


      mutate(
        () => {
          c.doublePairId =
            el.value ===
            '__new__'
              ? `Pair ${Date.now()
                  .toString()
                  .slice(-4)}`
              : el.value;
        },
        {
          pricing: true
        }
      );


      return;
    }


    if (
      handleComponentField(el)
    ) {
      return;
    }


    if (
      handlePanelPostField(el)
    ) {
      return;
    }


    if (
      handleCladdingField(el)
    ) {
      return;
    }


    handleStateInput(el);
  }
);


/* =========================================================
   LIVE INPUT EVENTS
   ========================================================= */

document.addEventListener(
  'input',
  (event) => {
    const el =
      event.target;


    if (
      !(
        el instanceof HTMLElement
      )
    ) {
      return;
    }


    if (
      el.dataset.statePath ===
        'client.name' ||
      el.dataset.statePath ===
        'client.mobile' ||
      el.dataset.statePath ===
        'client.notes'
    ) {
      let value =
        el.value;


      if (
        el.dataset.statePath ===
        'client.mobile'
      ) {
        value =
          String(value)
            .replace(/\D/g, '')
            .slice(0, 10);


        if (
          !value.startsWith('04')
        ) {
          value =
            `04${value.replace(/^0*/, '')}`
              .slice(0, 10);

          el.value =
            value;
        }
      }


      setPath(
        job,
        el.dataset.statePath,
        value
      );


      autosave();
      renderHeader();
    }
  }
);


/* =========================================================
   CLICK EVENTS
   ========================================================= */

document.addEventListener(
  'click',
  (event) => {
    const btn =
      event.target.closest(
        '[data-action], .nav-tab, #undo-btn'
      );


    if (!btn) {
      return;
    }


    /* NAVIGATION */

    if (
      btn.classList.contains(
        'nav-tab'
      )
    ) {
      navigate(
        btn.dataset.sectionTarget
      );

      return;
    }


    /* UNDO */

    if (
      btn.id ===
      'undo-btn'
    ) {
      undo();

      return;
    }


    const action =
      btn.dataset.action;


    /* =====================================================
       ADD COMPONENT
       ===================================================== */

    if (
      action ===
      'add-component'
    ) {
      const type =
        btn.dataset.componentType;


      mutate(
        () => {
          let c;


          if (
            type === 'post'
          ) {
            c =
              newPost();
          }


          if (
            type === 'gate'
          ) {
            c =
              newGate();
          }


          if (
            type ===
            'fixedPanel'
          ) {
            c =
              newFixedPanel();
          }


          if (!c) {
            return;
          }


          job.components.push(c);

          job.selectedComponentId =
            c.id;
        },
        {
          pricing: true,
          undoable: true
        }
      );


      setTimeout(
        () => {
          $(
            `#component-card-${CSS.escape(job.selectedComponentId)}`
          )?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        },
        0
      );


      return;
    }


    /* =====================================================
       SELECT COMPONENT
       ===================================================== */

    if (
      action ===
      'select-component'
    ) {
      job.selectedComponentId =
        btn.dataset.componentId;


      autosave();

      renderMudMap();
      renderComponentEditor();


      setTimeout(
        () => {
          $(
            `#component-card-${CSS.escape(job.selectedComponentId)}`
          )?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        },
        0
      );


      return;
    }


    /* =====================================================
       MOVE COMPONENT
       ===================================================== */

    if (
      action ===
        'move-component-left' ||
      action ===
        'move-component-right'
    ) {
      const id =
        btn.dataset.componentId;


      const index =
        job.components.findIndex(
          (c) =>
            c.id === id
        );


      if (
        index < 0
      ) {
        return;
      }


      const next =
        action ===
        'move-component-left'
          ? index - 1
          : index + 1;


      if (
        next < 0 ||
        next >=
          job.components.length
      ) {
        return;
      }


      mutate(
        () => {
          [
            job.components[index],
            job.components[next]
          ] = [
            job.components[next],
            job.components[index]
          ];
        },
        {
          pricing: true,
          undoable: true
        }
      );


      return;
    }


    /* =====================================================
       DELETE COMPONENT
       ===================================================== */

    if (
      action ===
      'delete-component'
    ) {
      const id =
        btn.dataset.componentId;


      const labels =
        componentDisplayLabels();


      confirmAction(
        'Delete component',

        `Delete ${labels[id] || 'this component'}?`,

        () => {
          mutate(
            () => {
              const target =
                job.components.find(
                  (c) =>
                    c.id === id
                );


              /*
                A DOUBLE GATE IS ONE LOGICAL UNIT.
                DELETE BOTH LEAVES.
              */

              if (
                target?.type ===
                  'gate' &&
                target.relationship ===
                  'double' &&
                target.doublePairId
              ) {
                job.components =
                  job.components.filter(
                    (c) =>
                      !(
                        c.type ===
                          'gate' &&
                        c.relationship ===
                          'double' &&
                        c.doublePairId ===
                          target.doublePairId
                      )
                  );
              } else {
                job.components =
                  job.components.filter(
                    (c) =>
                      c.id !== id
                  );
              }


              if (
                !job.components.some(
                  (c) =>
                    c.id ===
                    job.selectedComponentId
                )
              ) {
                job.selectedComponentId =
                  job.components[0]?.id ||
                  null;
              }
            },
            {
              pricing: true,
              undoable: true
            }
          );
        }
      );


      return;
    }


    /* =====================================================
       POST HEIGHT MODE
       ===================================================== */

    if (
      action ===
      'set-post-height-mode'
    ) {
      const c =
        job.components.find(
          (x) =>
            x.id ===
              btn.dataset.componentId &&
            x.type ===
              'post'
        );


      if (!c) {
        return;
      }


      mutate(
        () => {
          c.heightMode =
            btn.dataset.value;
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       FIXED PANEL POST HEIGHT MODE
       ===================================================== */

    if (
      action ===
      'set-panel-post-height-mode'
    ) {
      const panel =
        job.components.find(
          (x) =>
            x.id ===
              btn.dataset.componentId &&
            x.type ===
              'fixedPanel'
        );


      if (!panel) {
        return;
      }


      const p =
        btn.dataset.panelSide ===
        'left'
          ? panel.leftPost
          : panel.rightPost;


      mutate(
        () => {
          p.heightMode =
            btn.dataset.value;
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       GATE WIDTH MODE
       ===================================================== */

    if (
      action ===
      'set-gate-width-mode'
    ) {
      const c =
        job.components.find(
          (x) =>
            x.id ===
              btn.dataset.componentId &&
            x.type ===
              'gate'
        );


      if (!c) {
        return;
      }


      mutate(
        () => {
          c.widthMode =
            btn.dataset.value;


          if (
            c.widthMode ===
              'manual' &&
            (
              !c.manualWidthMm ||
              c.manualWidthMm <= 0
            )
          ) {
            c.manualWidthMm =
              calculation.gateWidths[c.id] ||
              1000;
          }


          /*
            KEEP THE TWO DOUBLE-GATE LEAVES
            TOGETHER WHEN CHANGING WIDTH MODE.
          */

          if (
            c.relationship ===
              'double' &&
            c.doublePairId
          ) {
            const partner =
              job.components.find(
                (g) =>
                  g.type ===
                    'gate' &&
                  g.id !==
                    c.id &&
                  g.relationship ===
                    'double' &&
                  g.doublePairId ===
                    c.doublePairId
              );


            if (partner) {
              partner.widthMode =
                c.widthMode;


              if (
                c.widthMode ===
                'manual'
              ) {
                partner.manualWidthMm =
                  c.manualWidthMm;
              }
            }
          }
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       ADD HOLE
       ===================================================== */

    if (
      action ===
      'add-hole'
    ) {
      const id =
        btn.dataset.componentId;


      const side =
        btn.dataset.panelSide ||
        '';


      const input =
        $(
          `#hole-input-${CSS.escape(id)}-${CSS.escape(side || 'main')}`
        );


      const value =
        Math.round(
          num(
            input?.value,
            -1
          )
        );


      if (
        value < 0
      ) {
        return;
      }


      let p;


      const comp =
        job.components.find(
          (c) =>
            c.id === id
        );


      if (
        comp?.type === 'post'
      ) {
        p =
          comp;
      }


      if (
        comp?.type ===
        'fixedPanel'
      ) {
        p =
          side === 'left'
            ? comp.leftPost
            : comp.rightPost;
      }


      if (!p) {
        return;
      }


      if (
        (
          p.holePositionsMm ||
          []
        ).includes(value)
      ) {
        toast(
          'That hole position is already entered'
        );

        return;
      }


      mutate(
        () => {
          p.holePositionsMm =
            [
              ...(p.holePositionsMm || []),
              value
            ].sort(
              (a, b) =>
                a - b
            );
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       DELETE HOLE
       ===================================================== */

    if (
      action ===
      'delete-hole'
    ) {
      const id =
        btn.dataset.componentId;


      const side =
        btn.dataset.panelSide ||
        '';


      const hole =
        num(
          btn.dataset.hole
        );


      const comp =
        job.components.find(
          (c) =>
            c.id === id
        );


      let p;


      if (
        comp?.type ===
        'post'
      ) {
        p =
          comp;
      }


      if (
        comp?.type ===
        'fixedPanel'
      ) {
        p =
          side === 'left'
            ? comp.leftPost
            : comp.rightPost;
      }


      if (!p) {
        return;
      }


      mutate(
        () => {
          p.holePositionsMm =
            (
              p.holePositionsMm ||
              []
            ).filter(
              (v) =>
                num(v) !==
                hole
            );
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       CLADDING TOGGLES
       ===================================================== */

    if (
      action ===
      'toggle-cladding'
    ) {
      const field =
        btn.dataset.field;


      mutate(
        () => {
          job.cladding[field] =
            !job.cladding[field];
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       PINE ACCESSORY LENGTH MODE
       ===================================================== */

    if (
      action ===
      'set-accessory-length-mode'
    ) {
      mutate(
        () => {
          job.cladding.accessoryLengthMode =
            btn.dataset.value;


          if (
            job.cladding.accessoryLengthMode ===
              'manual' &&
            !job.cladding.accessoryLengthM
          ) {
            job.cladding.accessoryLengthM =
              calculation.cladding.detail
                ?.autoAccessoryLengthM ||
              0;
          }
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       POWDER COATING
       ===================================================== */

    if (
      action ===
      'set-powder'
    ) {
      mutate(
        () => {
          job.powder.enabled =
            btn.dataset.value ===
            'yes';


          if (
            !job.powder.enabled
          ) {
            job.powder.colour =
              '';
          }
        },
        {
          pricing: true
        }
      );


      return;
    }


    /* =====================================================
       RESET MANUAL QUOTE TO AUTO
       ===================================================== */

    if (
      action ===
      'reset-quote-auto'
    ) {
      mutate(
        () => {
          job.quote.mode =
            'auto';

          job.quote.manualIncGST =
            null;
        }
      );


      return;
    }


    /* =====================================================
       COPY EMAIL
       ===================================================== */

    if (
      action ===
      'copy-email'
    ) {
      copyEmailRich();

      return;
    }


    /* =====================================================
       COPY SMS
       ===================================================== */

    if (
      action ===
      'copy-sms'
    ) {
      copyText(
        $('#sms-body').value,
        'SMS copied'
      );

      return;
    }


    /* =====================================================
       SAVE JOB
       ===================================================== */

    if (
      action ===
      'save-job'
    ) {
      saveCurrentJob();

      return;
    }


    /* =====================================================
       NEW JOB
       ===================================================== */

    if (
      action ===
      'new-job'
    ) {
      confirmAction(
        'New job',

        'Start a new job? The active job is autosaved, but use Save Current Job if you want it kept in Saved Jobs.',

        startNewJob
      );


      return;
    }


    /* =====================================================
       OPEN SAVED JOB
       ===================================================== */

    if (
      action ===
      'open-saved-job'
    ) {
      const id =
        btn.dataset.jobId;


      confirmAction(
        'Open saved job',

        'Open this saved job and replace the current active job?',

        () =>
          openSavedJob(id)
      );


      return;
    }


    /* =====================================================
       DELETE SAVED JOB
       ===================================================== */

    if (
      action ===
      'delete-saved-job'
    ) {
      const id =
        btn.dataset.jobId;


      confirmAction(
        'Delete saved job',

        'Permanently delete this saved job?',

        () =>
          deleteSavedJob(id)
      );
    }
  }
);


/* =========================================================
   MANUAL QUOTE PRICE
   ========================================================= */

$('#quote-final-amount')
  ?.addEventListener(
    'change',
    (event) => {
      const value =
        Math.max(
          0,
          num(
            event.target.value
          )
        );


      mutate(
        () => {
          job.quote.mode =
            'manual';

          job.quote.manualIncGST =
            value;
        }
      );
    }
  );


/* =========================================================
   CONFIRMATION DIALOG
   ========================================================= */

$('#confirm-dialog')
  ?.addEventListener(
    'close',
    (event) => {
      if (
        event.target.returnValue ===
          'confirm' &&
        typeof dialogAction ===
          'function'
      ) {
        const fn =
          dialogAction;

        dialogAction =
          null;

        fn();
      } else {
        dialogAction =
          null;
      }
    }
  );


/* =========================================================
   UNDO BUTTON
   ========================================================= */

function updateUndoButton() {
  const btn =
    $('#undo-btn');

  if (btn) {
    btn.disabled =
      undoStack.length === 0;
  }
}


/* =========================================================
   INITIALISE APP
   ========================================================= */

renderAll();

})();
