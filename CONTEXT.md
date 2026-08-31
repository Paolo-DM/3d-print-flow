# 3D Print Flow

3D Print Flow tracks color-batched production for catalog figures made either for customer orders or for stock.

## Language

**Figure**:
A catalog design with a required set of filament colors. It is not a particular physical copy or a unit of queued work.

**Order**:
A customer production batch containing zero or more Order Lines. An Order is Ready only when it has at least one Order Line, none of its lines has an issue, and every line is complete.

**Order Line**:
A quantity of one Figure belonging to an Order. It is complete when every required color has been printed for every copy.
_Avoid_: Completed figure

**Finished Order Line**:
A complete Order Line whose parent Order is not yet Ready. It remains visible in the Queue as progress evidence, where its color completion can still be corrected.
_Avoid_: Completed Order Line

**Stock Line**:
A quantity of one Figure produced without an Order. Once complete, it belongs in Completed rather than the active Queue.

**Queue**:
The production workspace for outstanding color work and progress within non-Ready Orders. Finished Order Lines remain as progress evidence but do not contribute to outstanding color demand.

**Completed**:
The historical workspace containing completed Stock Lines and Ready Orders.
_Avoid_: Archive

**Ready Order**:
An Order that has reached Ready and so belongs to Completed rather than the Queue. A single Order Line with an issue keeps the Order out of this state, however much of the rest is complete.
